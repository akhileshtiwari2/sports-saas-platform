import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../payments/stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';

export interface CreateCheckoutSessionDto {
  planId: string;
  billingInterval: 'monthly' | 'yearly';
  successUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  /** Get current active subscription for tenant (or trial/default) */
  async getTenantSubscription(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    return sub;
  }

  /** Get plans available for subscription */
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Create Stripe Checkout Session for new/upgrade subscription */
  async createCheckoutSession(tenantId: string, dto: CreateCheckoutSessionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const priceId =
      dto.billingInterval === 'yearly'
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;
    if (!priceId)
      throw new BadRequestException(
        `Plan does not support ${dto.billingInterval} billing`,
      );

    let customerId: string | null = null;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException('Tenant not found');
    if (tenant.stripeCustomerId) {
      customerId = tenant.stripeCustomerId;
    } else {
      const billingEmail = `${tenant.slug}@tenants.billing`;
      const customer = await this.stripe.createCustomer(billingEmail, tenant.name);
      customerId = customer.id;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is required');
    }
    const successUrl = dto.successUrl || `${frontendUrl}/lineup/settings?success=subscription`;
    const cancelUrl = dto.cancelUrl || `${frontendUrl}/lineup/settings`;

    const session = await this.stripe.createCheckoutSession(
      customerId,
      priceId,
      {
        tenantId,
        planId: plan.id,
        planName: plan.name,
        billingInterval: dto.billingInterval,
      },
      successUrl,
      cancelUrl,
    );

    return { url: session.url, sessionId: session.id };
  }

  /** Request downgrade - applies at period end */
  async requestDowngrade(tenantId: string, targetPlanId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    if (!sub || sub.status !== SubscriptionStatus.ACTIVE)
      throw new BadRequestException('No active subscription');

    const targetPlan = await this.prisma.plan.findUnique({
      where: { id: targetPlanId, isActive: true },
    });
    if (!targetPlan) throw new BadRequestException('Target plan not found');

    const planOrder = ['BASIC', 'PRO', 'ENTERPRISE'];
    const currentIdx = planOrder.indexOf(sub.plan.name);
    const targetIdx = planOrder.indexOf(targetPlan.name);
    if (targetIdx >= currentIdx)
      throw new BadRequestException('Target plan must be a downgrade');

    if (sub.stripeSubscriptionId) {
      await this.stripe.updateSubscriptionCancelAtPeriodEnd(
        sub.stripeSubscriptionId,
      );
    }

    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: true,
        scheduledPlanId: targetPlanId,
      },
      include: { plan: true, scheduledPlan: true },
    });
  }

  /** Cancel downgrade request */
  async cancelDowngradeRequest(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    if (!sub) throw new BadRequestException('No subscription found');
    if (sub.stripeSubscriptionId) {
      await this.stripe.cancelSubscriptionCancelAtPeriodEnd(
        sub.stripeSubscriptionId,
      );
    }
    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd: false, scheduledPlanId: null },
      include: { plan: true },
    });
  }

  /** Handle Stripe subscription webhook - activate/update/cancel */
  async handleSubscriptionCreated(stripeSub: Stripe.Subscription) {
    const tenantId = stripeSub.metadata?.tenantId;
    const planId = stripeSub.metadata?.planId;
    if (!tenantId || !planId) {
      this.logger.warn('Subscription created without tenantId/planId metadata');
      return;
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      this.logger.warn(`Plan ${planId} not found`);
      return;
    }

    const periodStart = new Date(stripeSub.current_period_start * 1000);
    const periodEnd = new Date(stripeSub.current_period_end * 1000);

    await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        stripeSubscriptionId: stripeSub.id,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeSubscriptionId: stripeSub.id,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
    this.logger.log(`Subscription activated for tenant ${tenantId}`);
  }

  async handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
      include: { plan: true },
    });
    if (!sub) return;

    const periodStart = new Date(stripeSub.current_period_start * 1000);
    const periodEnd = new Date(stripeSub.current_period_end * 1000);

    const planId = stripeSub.metadata?.planId ?? sub.planId;
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    await this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        ...(plan && { planId: plan.id }),
      },
    });
  }

  async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
      include: { scheduledPlan: true },
    });
    if (!sub) return;

    // Never grant paid access after Stripe deletion without a new active Stripe subscription.
    await this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        ...(sub.scheduledPlanId ? { planId: sub.scheduledPlanId } : {}),
        status: SubscriptionStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        scheduledPlanId: null,
        stripeSubscriptionId: null,
      },
    });
    this.logger.log(`Subscription cancelled for tenant ${sub.tenantId}`);
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!subId) return;

    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subId },
    });
    if (!sub) return;

    await this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    this.logger.warn(`Subscription ${sub.id} marked PAST_DUE - payment failed`);
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.CANCELLED;
    }
  }
}
