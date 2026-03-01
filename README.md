# Sports Facility SaaS – Multi-Tenant Booking Ecosystem

Production-ready multi-tenant SaaS for sports facility booking with 4 products:

| Product | Port | Description |
|---------|------|-------------|
| **DEN** | 3000 | Super Admin Dashboard |
| **PLAYBALL** | 3001 | Sales & Support Admin |
| **LINEUP** | 3002 | Facility Owner Booking Management |
| **SLATE** | 3003 | Consumer Marketplace App |

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN-style UI, Framer Motion, TanStack Query, Zustand
- **Backend:** NestJS, PostgreSQL, Prisma ORM, Redis, Stripe
- **Auth:** JWT, RBAC (SuperAdmin, SalesAdmin, FacilityAdmin, Coach, Customer)

## Project Structure

```
.
├── apps/
│   ├── den/          # Super Admin
│   ├── playball/     # Sales Admin
│   ├── lineup/       # Facility Owner
│   └── slate/        # Consumer App
├── packages/
│   ├── api/          # NestJS backend
│   ├── database/     # Prisma schema & client
│   ├── shared/       # Types, constants
│   └── ui/           # Shared UI utilities
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL
- Redis

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment setup

```bash
# Database
cp packages/database/.env.example packages/database/.env
# Edit DATABASE_URL

# API
cp packages/api/.env.example packages/api/.env
# Edit DATABASE_URL, REDIS_URL, JWT_SECRET
```

### 3. Initialize database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Run development servers

```bash
# All apps + API
pnpm dev

# Or individually
pnpm dev:den       # http://localhost:3000
pnpm dev:playball  # http://localhost:3001
pnpm dev:lineup    # http://localhost:3002
pnpm dev:slate     # http://localhost:3003
pnpm dev:api       # http://localhost:4000
```

## Architecture

### Multi-Tenant Model

- Each **Facility** belongs to a **Tenant**
- All data is isolated by `tenantId`
- **UserTenant** links users to tenants with roles

### RBAC Roles

| Role | Product | Access |
|------|---------|--------|
| SuperAdmin | DEN | Full platform control |
| SalesAdmin | PLAYBALL | Onboarding, support, refunds |
| FacilityAdmin | LINEUP | Own facility, slots, pricing |
| Coach | LINEUP | Lessons, batches |
| Customer | SLATE | Book, reviews, wallet |

### Booking Flow

1. **Lock slot** – `POST /bookings/lock` → Redis lock (5 min TTL)
2. **Create booking** – `POST /bookings` with `lockToken`
3. **Payment** – Stripe Payment Intent
4. **Confirm** – Release Redis lock, mark slot booked

### Redis Slot Locking

Prevents double booking:

```ts
// Acquire lock
const token = await redis.acquireSlotLock(slotId, userId);

// Create booking (with token)
await bookingService.createBooking({ slotId, lockToken: token, ... });

// Lock auto-expires in 5 min if booking not completed
```

### AI Pricing Engine

- `GET /ai-pricing/suggest/:slotId` – Historical analysis, peak/off-peak suggestions
- `POST /ai-pricing/apply/:slotId` – Apply suggested pricing

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| GET | `/auth/me` | Current user |
| GET | `/facilities/search` | Search facilities |
| GET | `/facilities/:id` | Facility details |
| GET | `/courts/:courtId/slots` | Available slots |
| POST | `/bookings/lock` | Lock slot |
| POST | `/bookings` | Create booking |
| GET | `/bookings/my` | My bookings |
| POST | `/bookings/:id/cancel` | Cancel booking |
| GET | `/ai-pricing/suggest/:slotId` | AI pricing suggestion |

## Design System

- **Colors:** Primary purple (262 83% 58%), dark/light mode
- **Borders:** `rounded-2xl`
- **Cards:** Glassmorphism, subtle gradients
- **Animations:** Framer Motion, layout transitions

## License

Proprietary.
