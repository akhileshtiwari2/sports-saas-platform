# Backend Security & Scalability Audit Report

**Date:** March 2025  
**Scope:** Multi-tenant sports booking SaaS API

---

## 1. ISSUES FOUND & FIXES APPLIED

### STEP 1 – Multi-Tenant Security

| Issue | Severity | Fix |
|-------|----------|-----|
| **tenantId trusted from X-Tenant-Id header** | CRITICAL | Removed. TenantMiddleware deleted. Replaced with TenantInterceptor that only sets `req.tenantId` from `req.user.tenantId` (JWT-verified). |
| **tenantId from client input** | CRITICAL | `resolveTenantForCreate()` in BookingService resolves tenantId from facility lookup only. Controller never passes client tenantId. |
| **Prisma in controller** | Medium | Moved facility lookup to `BookingService.resolveTenantForCreate()`. Controller now only delegates. |
| **Redis keys not namespaced** | Medium | Changed from `slot:lock:{slotId}` to `slot:lock:{tenantId}:{slotId}`. |

### STEP 2 – Auth & RBAC

| Issue | Severity | Fix |
|-------|----------|-----|
| **Public registration of privileged roles** | CRITICAL | `AuthService.register()` now restricts roles to `CUSTOMER` and `COACH`. `SUPER_ADMIN`, `SALES_ADMIN`, `FACILITY_ADMIN` silently default to `CUSTOMER`. |
| **JwtStrategy not validating user active** | Medium | Added `isActive` check. Deactivated users rejected. |
| **No tenantId validation in JWT** | Medium | For staff roles (`FACILITY_ADMIN`, `COACH`, `SALES_ADMIN`), JwtStrategy verifies tenantId exists in UserTenant. Prevents JWT tampering. |
| **User model missing isActive** | Low | Added `isActive Boolean @default(true)` to User schema. |

### STEP 3 – Redis Locking Validation

| Issue | Severity | Fix |
|-------|----------|-----|
| **Lock TTL** | Low | Increased from 5 min to 10 min (600s). |
| **Lock not namespaced** | Medium | All lock methods now require `tenantId`. Keys: `slot:lock:{tenantId}:{slotId}`. |
| **verifySlotLock missing tenantId** | Medium | `verifySlotLock(tenantId, slotId, token)` now verifies token and tenant scoping. |
| **lockSlot returns tenantId** | Low | `lockSlot()` now returns `{ lockToken, tenantId }` for downstream use. TenantId comes from slot→facility. |

### STEP 4 – Booking Transaction Safety

| Issue | Severity | Fix |
|-------|----------|-----|
| **No Payment record** | Medium | Payment record now created inside the booking transaction with `PaymentStatus.COMPLETED`. |
| **Rollback** | OK | Prisma `$transaction` already rolls back on failure. Slot update, promo increment, payment creation all in same tx. |

### STEP 5 – Cancellation Policy Edge Cases

| Issue | Severity | Fix |
|-------|----------|-----|
| **Can cancel COMPLETED** | Medium | Added check: `if (booking.status === COMPLETED) throw BadRequestException`. |
| **Already CANCELLED** | OK | Already handled. |
| **Date comparison** | Low | Explicit UTC conversion: `slotStartUtc = new Date(booking.slot.startTime).getTime()`. |
| **Refund amount safety** | Low | Capped: `refundAmount = Math.min(Math.max(0, refundAmount), totalAmount)`. |
| **Refund only if > 0** | OK | Already guarded: `if (refundAmount > 0)`. |

### STEP 6 – Stripe Safety

| Issue | Severity | Fix |
|-------|----------|-----|
| **No webhook handler** | CRITICAL | Added `StripeWebhookController` at `POST /payments/stripe/webhook`. |
| **Signature verification** | CRITICAL | Uses `stripe.webhooks.constructEvent(rawBody, signature, secret)`. |
| **Booking status from webhook only** | OK | `payment_intent.succeeded` updates booking to CONFIRMED. `payment_intent.payment_failed` cancels booking. |
| **Raw body** | OK | `NestFactory.create({ rawBody: true })` enables `req.rawBody` for verification. |

### STEP 7 – Performance Improvements

| Issue | Severity | Fix |
|-------|----------|-----|
| **Indexes** | Low | Added composite indexes: `(tenantId, facilityId)`, `(tenantId, status)`, `(userId, status)` on Booking. |
| **Pagination** | Medium | `getBookingsByUser` and `getBookingsByTenant` now accept `page`, `limit` (max 100). Return `{ items, total, page, limit }`. |
| **Facility search pagination** | Low | `searchFacilities` accepts `page`. |

### STEP 8 – Clean Architecture

| Issue | Severity | Fix |
|-------|----------|-----|
| **Prisma in controller** | Medium | Removed. Tenant resolution in `BookingService`. |
| **Magic strings** | Low | Facility status: `'Active'` → `FacilityStatus.ACTIVE` from types. |
| **DTO validation** | OK | CreateBookingDto, LockSlotDto, LoginDto, RegisterDto use class-validator. |

---

## 2. FILES CHANGED

### New Files
- `packages/api/src/common/interceptors/tenant.interceptor.ts` – Injects tenantId from JWT user
- `packages/api/src/payments/stripe-webhook.controller.ts` – Stripe webhook with signature verification

### Modified Files
- `packages/api/src/middleware/tenant.middleware.ts` – **Deleted**
- `packages/api/src/app.module.ts` – Tenant interceptor, removed middleware
- `packages/api/src/main.ts` – `rawBody: true` for Stripe
- `packages/api/src/common/constants.ts` – Redis key format with tenantId
- `packages/api/src/redis/redis.service.ts` – tenantId in all lock methods
- `packages/api/src/booking/booking.service.ts` – Tenant resolution, Payment record, cancellation checks, pagination
- `packages/api/src/booking/booking.controller.ts` – Removed Prisma, pagination params
- `packages/api/src/auth/auth.service.ts` – Restricted registration roles
- `packages/api/src/auth/strategies/jwt.strategy.ts` – isActive check, tenantId validation
- `packages/api/src/facility/facility.service.ts` – FacilityStatus enum, pagination
- `packages/api/src/facility/facility.controller.ts` – Page param
- `packages/api/src/payments/stripe.service.ts` – `getClient()` for webhooks
- `packages/api/src/payments/stripe.module.ts` – Webhook controller, PrismaModule
- `packages/database/prisma/schema.prisma` – User.isActive, Booking composite indexes

---

## 3. ENVIRONMENT VARIABLES

Add for production:

```
STRIPE_WEBHOOK_SECRET=whsec_xxx   # Required for Stripe webhook
```

---

## 4. MIGRATION

After pull:

```bash
cd packages/database && pnpm prisma generate
pnpm db:push   # or db:migrate
```

User table gains `isActive` (default true). Existing users unaffected.

---

## 5. API CHANGES (Breaking)

| Endpoint | Change |
|---------|--------|
| `POST /bookings/lock` | Response now includes `tenantId` (additive) |
| `GET /bookings/my` | Response: `{ items, total, page, limit }` (was array) |
| `GET /bookings/tenant` | Response: `{ items, total, page, limit }` (was array) |
| `GET /facilities/search` | Added `page` query param |

Frontends consuming `GET /bookings/my` or `GET /bookings/tenant` must use `response.items` instead of the raw array.
