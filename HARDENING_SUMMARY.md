# Production Hardening Summary

Improvements for reliability, security, and observability. No new features added.

---

## 1. Rate Limiting

**Location:** `packages/api/src/common/guards/rate-limit.guard.ts`, `rate-limit.decorator.ts`

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `POST /auth/login` | 5/min | Per IP |
| `POST /bookings/lock` | 10/min | Per user (or IP if unauthenticated) |
| `POST /bookings/create-payment-intent` | 5/min | Per user |

Uses Redis for distributed rate limiting. Returns `429 Too Many Requests` when exceeded.

---

## 2. Global Error Handler

**Location:** `packages/api/src/common/filters/all-exceptions.filter.ts`

- **Structured response:** `{ statusCode, message, error?, requestId?, timestamp }`
- **Production:** No stack traces in response
- **Development:** Stack trace included for debugging
- Logs 5xx to error, 4xx to warn
- Forwards 5xx to `MonitorService` for tracking

---

## 3. Structured Logging (Pino)

**Location:** `packages/api/src/common/logger.service.ts`, `logging.interceptor.ts`

- **Request ID:** Set via `X-Request-Id` header or generated UUID
- **Booking ID / Payment ID:** In `logBooking()` and `logPayment()` context
- **Logging interceptor:** Logs completed/failed requests with `requestId`, method, url, durationMs
- **Pino:** JSON in production, pretty-print in development
- **LOG_LEVEL:** Env var (default: `info` prod, `debug` dev)

---

## 4. Health Endpoint

**Location:** `packages/api/src/health/`

**GET /health** (public)

```json
{
  "status": "ok" | "degraded",
  "timestamp": "ISO8601",
  "checks": {
    "database": { "status": "up"|"down", "latencyMs": 2 },
    "redis": { "status": "up"|"down", "latencyMs": 1 }
  }
}
```

---

## 5. Stripe Webhook Idempotency

**Location:** `packages/api/src/redis/redis.service.ts`, `stripe-webhook.controller.ts`

- Uses Stripe `event.id` as idempotency key
- Stores processed events in Redis: `stripe:webhook:{eventId}` (TTL 24h)
- Skips duplicate processing on retries
- Marks event as processed only after successful handler run

---

## 6. Redis Reconnect Strategy

**Location:** `packages/api/src/redis/redis.service.ts`

- **retryStrategy:** Exponential backoff, max 30s between attempts
- **enableReadyCheck:** true
- **connectTimeout:** 10s
- **keepAlive:** 30s
- **maxRetriesPerRequest:** null (unlimited retries for subscribe scenarios)
- Event handlers: `error`, `connect`, `reconnecting`, `close` for observability

---

## 7. Prisma Connection Pooling

**Location:** `packages/api/src/prisma/prisma.service.ts`

- Documentation added for `?connection_limit=10` in DATABASE_URL
- No code change—Prisma uses pg pool by default
- **Recommendation:** Add `connection_limit=10` (or appropriate value) to DATABASE_URL for production

---

## 8. Error Tracking Abstraction

**Location:** `packages/api/src/common/services/monitor.service.ts`

- **MonitorService:** `captureException()`, `captureMessage()`
- Logs to console; placeholder for Sentry/Datadog
- Set `SENTRY_DSN` when integrating Sentry
- Used by `AllExceptionsFilter` for 5xx errors

---

## 9. Financial Reconciliation Script

**Location:** `packages/api/scripts/reconcile-payments.ts`

**Run:** `npm run reconcile` (from packages/api) or `npx ts-node packages/api/scripts/reconcile-payments.ts`

**Env:** `DATABASE_URL`, `STRIPE_SECRET_KEY`  
**Optional:** `RECONCILE_START`, `RECONCILE_END` (ISO dates, default: last 30 days)

**Checks:**
- Confirmed/Completed bookings have matching Stripe PaymentIntent (amount + status)
- Pending bookings with succeeded PI (webhook failure)
- Stripe API errors

**Output:** Mismatches as JSON; exit code 1 if any found.

---

## New Dependencies

- `pino`, `pino-http`, `pino-pretty` – structured logging
- `@nestjs/throttler` – (optional; custom Redis guard used instead)

---

## Architectural Weaknesses Identified

1. **Single process:** No horizontal scaling consideration for Redis slot locks—works if Redis is shared.
2. **No circuit breaker:** External calls (Stripe, DB) have no circuit breaker; failures can cascade.
3. **Webhook ordering:** Stripe events processed sequentially; out-of-order events (e.g. failed before succeeded) could cause inconsistent state—mitigated by idempotency and status checks.
4. **Audit trail:** AuditService exists but not used uniformly; payment state changes should be audited.
5. **Secrets:** No secret rotation strategy; `STRIPE_WEBHOOK_SECRET` rotation requires coordination.
6. **Rate limit key:** Login uses IP; behind a proxy, ensure `X-Forwarded-For` or similar is trusted and `trust proxy` is set.
