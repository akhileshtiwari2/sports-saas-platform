import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { StripeService } from '../payments/stripe.service';
import { PlanEnforcementService } from '../subscriptions/plan-enforcement.service';
import { BookingStatus, PaymentStatus } from 'types';
import { BookingStateService } from './booking-state.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly stripe: StripeService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  /**
   * Lock a slot for booking (call before payment).
   * tenantId resolved from slot's facility - never from client.
   */
  /**
   * Create pending booking + Stripe PaymentIntent for SLATE checkout.
   * Webhook confirms on payment success.
   */
  async createPaymentIntentForBooking(
    dto: { slotId: string; facilityId?: string; courtId?: string; promoCode?: string; notes?: string },
    userId: string,
  ): Promise<{ clientSecret: string; bookingId: string }> {
    const slotForTenant = await this.prisma.slot.findUnique({
      where: { id: dto.slotId },
      include: { court: { include: { facility: true } } },
    });
    if (!slotForTenant) {
      throw new BadRequestException('Slot not found');
    }
    const facilityId = dto.facilityId ?? slotForTenant.court.facilityId;
    const courtId = dto.courtId ?? slotForTenant.courtId;
    if (slotForTenant.court.facilityId !== facilityId) {
      throw new BadRequestException('Slot does not belong to facility');
    }
    const tenantId = slotForTenant.court.facility.tenantId;
    await this.planEnforcement.assertBookingLimit(tenantId);
    const now = new Date();
    const reservationUntil = new Date(now.getTime() + 10 * 60 * 1000);

    const checkoutSeed = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: dto.slotId },
        include: { court: { include: { facility: true } } },
      });
      if (!slot || slot.court.facilityId !== facilityId || slot.court.facility.tenantId !== tenantId) {
        throw new BadRequestException('Slot not found');
      }
      if (slot.courtId !== courtId) {
        throw new BadRequestException('Slot does not belong to court');
      }
      if (slot.isBooked || slot.status === 'BOOKED') {
        throw new ConflictException('Slot already booked');
      }
      const staleCutoff = new Date(now.getTime() - 10 * 60 * 1000);
      const openBookings = await tx.booking.findMany({
        where: {
          slotId: dto.slotId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        select: { id: true, status: true, createdAt: true },
      });
      const hasConfirmed = openBookings.some((b) => b.status === BookingStatus.CONFIRMED);
      if (hasConfirmed) {
        throw new ConflictException('Slot already has a confirmed booking');
      }
      const activePending = openBookings.find(
        (b) => b.status === BookingStatus.PENDING && b.createdAt >= staleCutoff,
      );
      if (activePending) {
        throw new ConflictException('Slot is currently pending payment');
      }
      const stalePendingIds = openBookings
        .filter((b) => b.status === BookingStatus.PENDING && b.createdAt < staleCutoff)
        .map((b) => b.id);
      if (stalePendingIds.length > 0) {
        for (const stale of openBookings) {
          if (stale.status === BookingStatus.PENDING && stale.createdAt < staleCutoff) {
            BookingStateService.validateTransition(
              stale.status as BookingStatus,
              BookingStatus.CANCELLED,
            );
          }
        }
        await tx.booking.updateMany({
          where: { id: { in: stalePendingIds }, status: BookingStatus.PENDING },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Pending payment expired',
            cancelledAt: now,
          },
        });
        await tx.payment.updateMany({
          where: { bookingId: { in: stalePendingIds }, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
      }

      const reserved = await tx.slot.updateMany({
        where: {
          id: dto.slotId,
          isBooked: false,
          OR: [
            { status: 'AVAILABLE' },
            {
              AND: [{ status: 'RESERVED' }, { reservedUntil: { lt: now } }],
            },
          ],
        },
        data: {
          status: 'RESERVED',
          reservedUntil: reservationUntil,
          reservedByBookingId: null,
        },
      });
      if (reserved.count !== 1) {
        throw new ConflictException('Slot is currently reserved by another checkout');
      }

      let discountAmount: Decimal | null = null;
      let promoCodeId: string | null = null;
      if (dto.promoCode) {
        const promo = await tx.promoCode.findFirst({
          where: {
            facilityId,
            code: dto.promoCode,
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        });
        if (promo && (promo.maxUses == null || promo.usedCount < promo.maxUses)) {
          promoCodeId = promo.id;
          discountAmount =
            promo.discountType === 'percentage'
              ? new Decimal((Number(slot.basePrice) * Number(promo.discountValue)) / 100)
              : new Decimal(promo.discountValue);
        }
      }

      const basePrice =
        slot.weekendPrice && this.isWeekend(slot.startTime) ? slot.weekendPrice : slot.basePrice;
      const totalAmount = discountAmount
        ? new Decimal(Math.max(0, Number(basePrice) - Number(discountAmount)))
        : basePrice;

      const booking = await tx.booking.create({
        data: {
          slotId: dto.slotId,
          userId,
          tenantId,
          facilityId,
          courtId,
          status: BookingStatus.PENDING,
          totalAmount,
          promoCodeId,
          discountAmount,
          notes: dto.notes,
        },
      });

      await tx.slot.update({
        where: { id: dto.slotId },
        data: { reservedByBookingId: booking.id },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalAmount,
          currency: slot.currency ?? 'INR',
          status: PaymentStatus.PENDING,
        },
      });

      return {
        bookingId: booking.id,
        amountPaise: Math.round(Number(totalAmount) * 100),
        currency: slot.currency?.toLowerCase() ?? 'inr',
      };
    });

    try {
      const pi = await this.stripe.createPaymentIntent(
        checkoutSeed.amountPaise,
        checkoutSeed.currency,
        { bookingId: checkoutSeed.bookingId, userId },
      );
      return { clientSecret: pi.client_secret!, bookingId: checkoutSeed.bookingId };
    } catch (error) {
      // If Stripe intent creation fails, release reservation and cancel pending booking atomically.
      await this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: checkoutSeed.bookingId },
          select: { id: true, status: true, slotId: true },
        });
        if (!booking || booking.status !== BookingStatus.PENDING) return;
        BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.CANCELLED);
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Payment intent creation failed',
            cancelledAt: new Date(),
          },
        });
        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
        await tx.slot.updateMany({
          where: { id: booking.slotId, reservedByBookingId: booking.id, status: 'RESERVED' },
          data: { status: 'AVAILABLE', reservedUntil: null, reservedByBookingId: null, isBooked: false },
        });
      });
      throw error;
    }
  }

  async lockSlot(slotId: string, userId: string): Promise<{ lockToken: string; tenantId: string }> {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { court: { include: { facility: true } } },
    });
    if (!slot) throw new BadRequestException('Slot not found');
    const now = new Date();
    const activelyReserved =
      slot.status === 'RESERVED' && slot.reservedUntil != null && slot.reservedUntil > now;
    if (slot.isBooked || slot.status === 'BOOKED' || activelyReserved) {
      throw new ConflictException('Slot already booked');
    }

    const tenantId = slot.court.facility.tenantId;
    const token = await this.redis.acquireSlotLock(tenantId, slotId, userId);
    if (!token) throw new ConflictException('Slot is being booked by someone else. Try again.');

    return { lockToken: token, tenantId };
  }

  async getBookingsByUser(
    userId: string,
    status?: BookingStatus,
    page = 1,
    limit = 20,
  ) {
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { slot: true, court: true, facility: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getBookingsByTenant(
    tenantId: string,
    filters?: {
      facilityId?: string;
      status?: BookingStatus;
      search?: string;
      start?: Date;
      end?: Date;
    },
    page = 1,
    limit = 20,
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (filters?.facilityId) where.facilityId = filters.facilityId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.user = { OR: [{ name: { contains: filters.search, mode: 'insensitive' } }, { email: { contains: filters.search, mode: 'insensitive' } }] };
    }
    if (filters?.start || filters?.end) {
      const slotTime: Record<string, unknown> = {};
      if (filters.start) slotTime.gte = filters.start;
      if (filters.end) slotTime.lte = filters.end;
      if (Object.keys(slotTime).length) where.slot = { startTime: slotTime };
    }
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          slot: true,
          court: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Cancel booking with refund calculation based on facility cancellation policy.
   * @param adminOverride - If true (admin only), full refund regardless of policy
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    adminOverride = false,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        slot: true,
        facility: true,
      },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (booking.userId !== userId && !adminOverride) throw new ForbiddenException('Not your booking');
    BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.CANCELLED);
    if (
      booking.status === BookingStatus.CONFIRMED &&
      (booking.commissionRateSnapshot == null ||
        booking.commissionAmountSnapshot == null ||
        booking.netPayoutSnapshot == null)
    ) {
      throw new BadRequestException('Confirmed booking missing immutable commission snapshot');
    }

    const totalAmount = Number(booking.totalAmount);
    let refundAmount = 0;

    if (adminOverride) {
      refundAmount = totalAmount;
    } else {
      // UTC comparison for consistency across timezones
      const nowUtc = Date.now();
      const slotStartUtc = new Date(booking.slot.startTime).getTime();
      const hoursUntilSlot = (slotStartUtc - nowUtc) / (1000 * 60 * 60);
      const policy = booking.facility.cancellationPolicy;

      if (policy === 'FREE_UNTIL_24H' && hoursUntilSlot >= 24) refundAmount = totalAmount;
      else if (policy === 'HALF_REFUND_12H' && hoursUntilSlot >= 12) refundAmount = totalAmount / 2;
      else if (policy === 'NO_REFUND') refundAmount = 0;
      else refundAmount = 0;
    }
    // Cap refund at total - safety against float rounding
    refundAmount = Math.min(Math.max(0, refundAmount), totalAmount);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
        },
      });
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          isBooked: false,
          status: 'AVAILABLE',
          reservedUntil: null,
          reservedByBookingId: null,
        },
      });
      if (refundAmount > 0) {
        if (
          booking.commissionRateSnapshot == null ||
          booking.commissionAmountSnapshot == null ||
          booking.netPayoutSnapshot == null
        ) {
          throw new BadRequestException('Refund requires immutable commission snapshots');
        }
        const commissionRate = Number(booking.commissionRateSnapshot);
        const commissionRefundAmount = (refundAmount * commissionRate) / 100;
        const netPayoutReversal = refundAmount - commissionRefundAmount;
        await tx.refund.create({
          data: {
            bookingId,
            amount: new Decimal(refundAmount),
            reason: reason ?? 'Customer cancellation',
            status: 'PENDING',
            adminOverride,
            metadata: {
              commissionRateSnapshot: commissionRate,
              commissionRefundAmount,
              netPayoutReversal,
            },
          },
        });
      }
    });

    await this.audit.log({
      actorId: userId,
      actorRole: adminOverride ? 'ADMIN' : 'CUSTOMER',
      tenantId: booking.tenantId,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: bookingId,
      metadata: { refundAmount, adminOverride, reason },
    });

    return { success: true, refundAmount };
  }

  /**
   * Mark booking as COMPLETED (post-slot end). Enforces state machine.
   */
  async markCompleted(bookingId: string, actorId: string, actorRole: string, actorTenantId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (actorTenantId && booking.tenantId !== actorTenantId) {
      throw new ForbiddenException('Booking does not belong to your tenant');
    }
    if (
      booking.commissionRateSnapshot == null ||
      booking.commissionAmountSnapshot == null ||
      booking.netPayoutSnapshot == null
    ) {
      throw new BadRequestException('Confirmed booking missing immutable commission snapshot');
    }
    BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.COMPLETED);

    if (actorTenantId) {
      const updated = await this.prisma.booking.updateMany({
        where: { id: bookingId, tenantId: actorTenantId },
        data: { status: BookingStatus.COMPLETED, completedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ForbiddenException('Booking does not belong to your tenant');
      }
    } else {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED, completedAt: new Date() },
      });
    }

    await this.audit.log({
      actorId,
      actorRole,
      tenantId: booking.tenantId,
      action: 'BOOKING_COMPLETED',
      entityType: 'Booking',
      entityId: bookingId,
    });
  }

  /**
   * Mark booking as NO_SHOW. Enforces state machine.
   */
  async markNoShow(bookingId: string, actorId: string, actorRole: string, actorTenantId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (actorTenantId && booking.tenantId !== actorTenantId) {
      throw new ForbiddenException('Booking does not belong to your tenant');
    }
    if (
      booking.commissionRateSnapshot == null ||
      booking.commissionAmountSnapshot == null ||
      booking.netPayoutSnapshot == null
    ) {
      throw new BadRequestException('Confirmed booking missing immutable commission snapshot');
    }
    BookingStateService.validateTransition(booking.status as BookingStatus, BookingStatus.NO_SHOW);

    await this.prisma.$transaction(async (tx) => {
      if (actorTenantId) {
        const updated = await tx.booking.updateMany({
          where: { id: bookingId, tenantId: actorTenantId },
          data: { status: BookingStatus.NO_SHOW },
        });
        if (updated.count !== 1) {
          throw new ForbiddenException('Booking does not belong to your tenant');
        }
      } else {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.NO_SHOW },
        });
      }
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          isBooked: false,
          status: 'AVAILABLE',
          reservedUntil: null,
          reservedByBookingId: null,
        },
      });
    });

    await this.audit.log({
      actorId,
      actorRole,
      tenantId: booking.tenantId,
      action: 'BOOKING_NO_SHOW',
      entityType: 'Booking',
      entityId: bookingId,
    });
  }

  private isWeekend(d: Date): boolean {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  }
}
