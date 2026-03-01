#!/usr/bin/env npx ts-node
/**
 * Financial reconciliation: Compare bookings vs Stripe payments.
 * Run: npx ts-node packages/api/scripts/reconcile-payments.ts
 *
 * Requires: DATABASE_URL, STRIPE_SECRET_KEY
 * Outputs: Mismatches, orphans, summary
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required');
}
if (process.env.NODE_ENV !== 'production' && stripeSecretKey.startsWith('sk_live_')) {
  throw new Error('Live Stripe secret key is not allowed outside production');
}
const stripe = new Stripe(stripeSecretKey);

interface Mismatch {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  stripePaymentId: string | null;
  amountPaise: number;
  stripeAmount: number | null;
  reason: string;
}

async function main() {
  console.info('=== Financial Reconciliation ===\n');

  const startDate = process.env.RECONCILE_START
    ? new Date(process.env.RECONCILE_START)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = process.env.RECONCILE_END ? new Date(process.env.RECONCILE_END) : new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
    },
    include: { payment: true },
    orderBy: { createdAt: 'asc' },
  });

  const mismatches: Mismatch[] = [];
  let processed = 0;
  let stripeChecked = 0;

  for (const b of bookings) {
    processed++;
    const amountPaise = Math.round(Number(b.totalAmount) * 100);
    const payment = b.payment;

    if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
      if (!payment?.stripePaymentId) {
        mismatches.push({
          bookingId: b.id,
          bookingStatus: b.status,
          paymentStatus: payment?.status ?? null,
          stripePaymentId: null,
          amountPaise,
          stripeAmount: null,
          reason: 'Confirmed booking has no Stripe payment ID',
        });
        continue;
      }

      try {
        stripeChecked++;
        const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
        const stripeAmount = pi.amount;

        if (stripeAmount !== amountPaise) {
          mismatches.push({
            bookingId: b.id,
            bookingStatus: b.status,
            paymentStatus: payment.status,
            stripePaymentId: payment.stripePaymentId,
            amountPaise,
            stripeAmount,
            reason: `Amount mismatch: DB=${amountPaise} paise, Stripe=${stripeAmount} paise`,
          });
        } else if (pi.status !== 'succeeded') {
          mismatches.push({
            bookingId: b.id,
            bookingStatus: b.status,
            paymentStatus: payment.status,
            stripePaymentId: payment.stripePaymentId,
            amountPaise,
            stripeAmount: stripeAmount,
            reason: `Stripe PI status is ${pi.status}, expected succeeded`,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Stripe API error';
        mismatches.push({
          bookingId: b.id,
          bookingStatus: b.status,
          paymentStatus: payment?.status ?? null,
          stripePaymentId: payment?.stripePaymentId ?? null,
          amountPaise,
          stripeAmount: null,
          reason: `Stripe API error: ${message}`,
        });
      }
    } else if (b.status === 'PENDING' && payment?.stripePaymentId) {
      try {
        stripeChecked++;
        const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
        if (pi.status === 'succeeded') {
          mismatches.push({
            bookingId: b.id,
            bookingStatus: b.status,
            paymentStatus: payment.status,
            stripePaymentId: payment.stripePaymentId,
            amountPaise,
            stripeAmount: pi.amount,
            reason: 'Stripe succeeded but booking still PENDING - webhook may have failed',
          });
        }
      } catch {
        // Ignore - payment might be abandoned
      }
    }
  }

  console.info(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.info(`Bookings processed: ${processed}`);
  console.info(`Stripe API calls: ${stripeChecked}`);
  console.info(`Mismatches: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.info('--- Mismatches ---');
    mismatches.forEach((m) => {
      console.info(JSON.stringify(m, null, 2));
    });
    process.exitCode = 1;
  } else {
    console.info('No mismatches found.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
