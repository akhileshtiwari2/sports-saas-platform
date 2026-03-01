import {
  Controller,
  Post,
  Req,
  Headers,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Public } from '../auth/decorators/public.decorator';
import Stripe from 'stripe';
import { BookingStatus, PaymentStatus } from 'types';
import { LoggerService } from '../common/logger.service';
import { BookingStateService } from '../booking/booking-state.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Stripe webhook handler.
 * SECURITY: Never trust frontend payment success - booking status updated ONLY via webhook.
 * Signature verification required. Idempotent via event.id.
 */
@Controller('payments/stripe/webhook')
export class StripeWebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly subscriptions: SubscriptionsService,
    private readonly log: LoggerService,
  ) {}

  @Post()
  @Public()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature');
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.log.warn('STRIPE_WEBHOOK_SECRET not set - webhook disabled');
      throw new BadRequestException('Webhook not configured');
    }

    const rawBody = req.rawBody; // Set by NestFactory.create({ rawBody: true })
    if (!rawBody) throw new BadRequestException('Raw body required for webhook verification');

    let event: Stripe.Event;
    try {
      event = this.stripe.getClient().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown signature verification error';
      this.log.warn(`Webhook signature verification failed: ${message}`);
      throw new BadRequestException('Invalid signature');
    }

    const processingState = await this.redis.beginWebhookProcessing(event.id);
    if (processingState === 'already_processed') {
      this.log.info(`Webhook replay ignored for already processed event ${event.id}`);
      return { received: true };
    }
    if (processingState === 'in_progress') {
      this.log.warn(`Webhook event ${event.id} is already in progress`);
      return { received: true };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'customer.subscription.created':
          await this.subscriptions.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.subscriptions.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.subscriptions.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await this.subscriptions.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          this.log.debug(`Unhandled event type: ${event.type}`);
      }
      await this.redis.finalizeWebhookProcessing(event.id);
    } catch (error) {
      await this.redis.failWebhookProcessing(event.id);
      throw error;
    }
    return { received: true };
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) {
      this.log.warn('PaymentIntent missing bookingId metadata');
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });
      if (!booking) {
        this.log.warn(`Booking ${bookingId} not found for payment ${paymentIntent.id}`);
        return;
      }
      if (booking.status === BookingStatus.CONFIRMED) {
        this.log.debug(`Booking ${bookingId} already confirmed`);
        return;
      }
      if (booking.status === BookingStatus.CANCELLED) {
        this.log.warn(`Booking ${bookingId} was cancelled - ignoring payment`);
        return;
      }
      BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.CONFIRMED);

      const existingConfirmed = await tx.booking.findFirst({
        where: {
          slotId: booking.slotId,
          status: BookingStatus.CONFIRMED,
          NOT: { id: booking.id },
        },
        select: { id: true },
      });
      if (existingConfirmed) {
        this.log.warn(
          `Slot ${booking.slotId} already has confirmed booking ${existingConfirmed.id}; cancelling duplicate ${booking.id}`,
        );
        BookingStateService.validateTransition(
          booking.status as BookingStatus,
          BookingStatus.CANCELLED,
        );
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Duplicate paid booking prevented by webhook',
            cancelledAt: new Date(),
          },
        });
        await tx.payment.updateMany({
          where: { bookingId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, stripePaymentId: paymentIntent.id },
        });
        return;
      }

      const commission =
        (await tx.commission.findFirst({
          where: {
            tenantId: booking.tenantId,
            facilityId: booking.facilityId,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        })) ??
        (await tx.commission.findFirst({
          where: {
            tenantId: booking.tenantId,
            facilityId: null,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        }));
      const commissionRateSnapshot = new Decimal(commission ? commission.percentage : 0);
      const commissionAmountSnapshot = booking.totalAmount
        .mul(commissionRateSnapshot)
        .div(new Decimal(100));
      const netPayoutSnapshot = booking.totalAmount.sub(commissionAmountSnapshot);

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          commissionRateSnapshot,
          commissionAmountSnapshot,
          netPayoutSnapshot,
        },
      });
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          isBooked: true,
          status: 'BOOKED',
          reservedUntil: null,
          reservedByBookingId: null,
        },
      });
      if (booking.payment) {
        await tx.payment.update({
          where: { bookingId },
          data: {
            status: PaymentStatus.COMPLETED,
            stripePaymentId: paymentIntent.id,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            bookingId,
            amount: booking.totalAmount,
            currency: booking.currency,
            status: PaymentStatus.COMPLETED,
            stripePaymentId: paymentIntent.id,
          },
        });
      }
    });
    this.log.logPayment('confirmed', paymentIntent.id, { bookingId });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const bookingId = paymentIntent.metadata?.bookingId;
    if (!bookingId) return;

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });
      if (!booking || booking.status !== BookingStatus.PENDING) return;
      BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.CANCELLED);

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: 'Payment failed',
          cancelledAt: new Date(),
        },
      });
      await tx.slot.updateMany({
        where: { id: booking.slotId, reservedByBookingId: booking.id },
        data: {
          isBooked: false,
          status: 'AVAILABLE',
          reservedUntil: null,
          reservedByBookingId: null,
        },
      });
      if (booking.payment) {
        await tx.payment.update({
          where: { bookingId },
          data: { status: PaymentStatus.FAILED },
        });
      }
    });
    this.log.logPayment('failed', paymentIntent.id, { bookingId });
  }
}
