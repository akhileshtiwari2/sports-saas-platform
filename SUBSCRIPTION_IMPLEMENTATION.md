# SaaS Subscription Implementation

Enterprise-grade subscription enforcement for the multi-tenant sports booking platform.

## 1. Database Changes

### New Models

**Plan**
- `id`, `name` (BASIC, PRO, ENTERPRISE)
- `maxCourts`, `maxCoaches`, `maxBookingsPerMonth`
- `features` (JSON) - e.g. `{ analytics: true, aiPricing: true }`
- `priceMonthly`, `priceYearly`
- `stripePriceIdMonthly`, `stripePriceIdYearly` - set after creating Stripe Price objects
- `sortOrder`, `isActive`

**TenantSubscription**
- `tenantId`, `planId`
- `stripeSubscriptionId`
- `status` (ACTIVE, PAST_DUE, CANCELLED, TRIALING)
- `currentPeriodStart`, `currentPeriodEnd`
- `cancelAtPeriodEnd`, `scheduledPlanId` (for downgrade at period end)

**Tenant** - added `stripeCustomerId`

### Migration

```bash
# Set DATABASE_URL, then:
pnpm --filter database db:migrate
# or
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

### Seed Plans

```bash
pnpm --filter database db:seed
# or
cd packages/database && npx ts-node prisma/seed.ts
```

## 2. Stripe Integration

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/subscriptions/plans` | List plans (public) |
| GET | `/subscriptions/me` | Current tenant subscription |
| GET | `/subscriptions/usage` | Usage vs limits |
| POST | `/subscriptions/create-checkout-session` | Create Stripe Checkout, returns `{ url }` |
| POST | `/subscriptions/downgrade` | Request downgrade at period end |
| POST | `/subscriptions/cancel-downgrade` | Cancel downgrade request |

### Webhook (existing `/payments/stripe/webhook`)

Handles:
- `customer.subscription.created` - activate subscription
- `customer.subscription.updated` - sync status, period, cancel_at_period_end
- `customer.subscription.deleted` - cancel or apply scheduled downgrade
- `invoice.payment_failed` - set status to PAST_DUE

### Stripe Setup

1. Create Products & Prices in Stripe Dashboard for each plan
2. Set `stripePriceIdMonthly` and `stripePriceIdYearly` on Plan records
3. Configure webhook URL: `https://your-api.com/payments/stripe/webhook`
4. Add events: `customer.subscription.*`, `invoice.payment_failed`
5. Set `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`

## 3. Plan Enforcement Middleware

**PlanEnforcementService** checks limits before:

- **Court** create → `assertCourtLimit(tenantId)`
- **Coach** create → `assertCoachLimit(tenantId)`
- **Slot** create → `assertSlotLimit(tenantId)` (inherits court limit)
- **Lesson** create → `assertLessonLimit(tenantId)` (inherits coach limit)
- **Booking** create → `assertBookingLimit(tenantId)` (monthly count)

Returns **403** with upgrade message when limit exceeded.

## 4. Feature Gating

**FeatureService**

- `assertAnalytics(tenantId)` - gates `/analytics/facility/:id`
- `assertAIPricing(tenantId)` - gates `/ai-pricing/suggest/:slotId`, `/ai-pricing/apply/:slotId`

Features come from `plan.features` JSON (e.g. `{ analytics: true, aiPricing: true }`).

## 5. Upgrade / Downgrade Flow

- **Upgrade**: Immediate via Stripe Checkout. Redirect to Stripe, webhook activates new plan.
- **Downgrade**: `POST /subscriptions/downgrade` with `targetPlanId`. Sets `cancelAtPeriodEnd`, `scheduledPlanId`. At period end, webhook applies downgrade.
- **Over-limit**: PlanEnforcementService blocks creation; tenant must upgrade or wait for downgrade.

## 6. Frontend Integration

### LINEUP Settings (`/lineup/settings`)

- Current plan
- Usage: courts, coaches, bookings this month vs limits
- Upgrade buttons (redirect to Stripe Checkout when prices configured)

### DEN

- **Subscriptions** (`/den/subscriptions`): Real data from `GET /tenants/subscriptions`
- **Tenant Drawer**: Subscription status, plan name, renew/cancel date

## 7. Default Free Tier

When no active subscription:
- `maxCourts: 2`, `maxCoaches: 2`, `maxBookingsPerMonth: 100`
- `analytics: false`, `aiPricing: false`

## 8. File Summary

| Path | Purpose |
|------|---------|
| `packages/database/prisma/schema.prisma` | Plan, TenantSubscription, Tenant.stripeCustomerId |
| `packages/database/prisma/seed.ts` | Seed BASIC, PRO, ENTERPRISE plans |
| `packages/api/src/subscriptions/` | Subscriptions module |
| `packages/api/src/payments/stripe.service.ts` | createCheckoutSession, cancel_at_period_end |
| `packages/api/src/payments/stripe-webhook.controller.ts` | Subscription webhook handlers |
| `packages/api/src/subscriptions/plan-enforcement.service.ts` | Limit checks |
| `packages/api/src/subscriptions/feature.service.ts` | assertAnalytics, assertAIPricing |
| `apps/lineup/src/app/lineup/settings/page.tsx` | Plan, usage, upgrade UI |
| `apps/den/src/app/den/subscriptions/page.tsx` | Subscription list (real API) |
| `apps/den/src/components/tenants/tenant-drawer.tsx` | Subscription status per tenant |
