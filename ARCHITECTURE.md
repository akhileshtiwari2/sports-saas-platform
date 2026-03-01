# Sports Facility SaaS - Architecture

## Monorepo Structure

```
/
├── apps/
│   ├── den/           # Super Admin - SaaS owner dashboard
│   ├── playball/      # Sales & Support admin
│   ├── lineup/        # Facility owner dashboard
│   └── slate/         # Customer booking app
├── packages/
│   ├── api/           # NestJS backend (single API for all apps)
│   ├── database/      # Prisma schema & client
│   ├── types/         # Shared TypeScript types, DTOs, enums
│   └── ui/            # Shared React components
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## RBAC Roles

| Role | App | Access |
|------|-----|--------|
| SUPER_ADMIN | DEN | Global platform control |
| SALES_ADMIN | PLAYBALL | Onboarding, support, refunds |
| FACILITY_ADMIN | LINEUP | Own facility management |
| COACH | LINEUP | Lessons, batches |
| CUSTOMER | SLATE | Bookings, reviews, wallet |

## Multi-Tenant Model

- Every `Facility` belongs to a `Tenant`
- All tenant-scoped tables include `tenantId`
- Middleware injects tenant context from JWT
- Row-level security via tenantId filtering

## Booking Flow

1. **Lock** → Redis SET NX (5 min TTL)
2. **Create** → PENDING booking record
3. **Payment** → Stripe PaymentIntent
4. **On success** → CONFIRMED, release lock
5. **On failure** → Release lock, cleanup
