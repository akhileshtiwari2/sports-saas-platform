import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Stripe integration for payments
 * Handles: Payment intents, refunds, subscriptions
 */
@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private config: ConfigService) {
    const key = this.config.get('STRIPE_SECRET_KEY');
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    if (process.env.NODE_ENV !== 'production' && key.startsWith('sk_live_')) {
      throw new Error('Live Stripe secret key is not allowed outside production');
    }
    this.stripe = new Stripe(key);
    this.logger.log(`Stripe initialized (${key.startsWith('sk_test_') ? 'sandbox' : 'live'})`);
  }

  async createPaymentIntent(
    amount: number, // in smallest currency unit (paise/cents)
    currency: string,
    metadata: { bookingId: string; userId: string },
  ) {
    return this.stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // optional partial refund
    });
  }

  async createCustomer(emailOrName: string, name?: string) {
    const email = emailOrName.includes('@') ? emailOrName : `${emailOrName}@billing.placeholder`;
    return this.stripe.customers.create({
      email,
      name: name ?? emailOrName,
    });
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    metadata: Record<string, string>,
    successUrl: string,
    cancelUrl: string,
  ) {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: { metadata },
    });
    return { url: session.url!, id: session.id };
  }

  async updateSubscriptionCancelAtPeriodEnd(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async cancelSubscriptionCancelAtPeriodEnd(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
  ) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
    });
  }

  /** Expose client for webhook signature verification */
  getClient(): Stripe {
    return this.stripe;
  }
}
