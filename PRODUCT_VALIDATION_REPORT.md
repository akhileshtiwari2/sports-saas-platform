# Product Validation Report – 4-Product SaaS Vision

**Date:** March 2025  
**Scope:** DEN, PLAYBALL, LINEUP, SLATE backend alignment

---

## 1. MISSING PRODUCT FEATURES (Before Implementation)

| Product | Missing Feature | Status |
|---------|-----------------|--------|
| **DEN** | GMV, active tenants, monthly growth | ✅ Implemented |
| **DEN** | Slot utilization %, peak hour detection | ✅ Implemented |
| **DEN** | Commission tracking | ✅ Implemented |
| **DEN** | Audit trail for critical actions | ✅ Implemented |
| **PLAYBALL** | Refund approval (SALES_ADMIN) | ✅ Implemented |
| **PLAYBALL** | Refund processing (SUPER_ADMIN) | ✅ Implemented |
| **LINEUP** | Mark booking COMPLETED / NO_SHOW | ✅ Implemented |
| **LINEUP** | Facility revenue, occupancy heatmap | ✅ Implemented |
| **SLATE** | User booking frequency, repeat rate | ✅ Implemented |
| **All** | Strict booking state machine | ✅ Implemented |

---

## 2. SCHEMA CHANGES

### AuditLog (New)

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  actorId    String
  actorRole  String
  tenantId   String?
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([tenantId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Refund (Enhanced)

- `rejectedBy`, `rejectedAt`, `rejectionReason` – audit trail for rejections
- `processedBy`, `processedAt` – audit trail for processing
- `metadata` – decision notes (JSON)
- `@@index([createdAt])`

---

## 3. BOOKING STATE MACHINE

**Allowed transitions:**

| From     | To                       |
|----------|--------------------------|
| PENDING  | CONFIRMED, CANCELLED     |
| CONFIRMED| CANCELLED, COMPLETED, NO_SHOW |
| CANCELLED| (terminal)               |
| COMPLETED| (terminal)               |
| NO_SHOW  | (terminal)                |

- Centralized in `BookingStateService.validateTransition()`
- All status changes use this validation
- `markCompleted()`, `markNoShow()` added for LINEUP (FACILITY_ADMIN, COACH)

---

## 4. REFUND WORKFLOW (PLAYBALL)

**State machine:** PENDING → APPROVED | REJECTED → PROCESSED (from APPROVED only)

| Endpoint | Role | Action |
|----------|------|--------|
| `GET /refunds/pending` | SALES_ADMIN, SUPER_ADMIN | List pending refunds |
| `POST /refunds/:id/approve` | SALES_ADMIN | Approve refund |
| `POST /refunds/:id/reject` | SALES_ADMIN | Reject with reason |
| `POST /refunds/:id/process` | SUPER_ADMIN | Mark as processed (post-Stripe payout) |

- Audit log entries for all state changes
- `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `processedBy`, `processedAt` in schema

---

## 5. COMMISSION & REVENUE (DEN)

**CommissionService:**

- `getCommissionRate(tenantId, facilityId?)` – facility overrides tenant default
- `getPayoutForBooking(bookingId)` – booking revenue breakdown:
  - totalAmount, facilityRevenue, commissionAmount, commissionPercent, netPayout
- `getMonthlyRevenueByTenant(year, month)` – per-tenant revenue for Den

**Endpoints:**

- `GET /commission/booking/:bookingId` – single booking breakdown
- `GET /commission/monthly?year=&month=` – monthly summary (SUPER_ADMIN only)

---

## 6. SLOT UTILIZATION (DEN)

**AnalyticsService.getSlotUtilization(startDate, endDate):**

- totalSlots, bookedSlots, utilizationPercent
- peakHours: top 10 hours by booking count

**Endpoint:** `GET /analytics/utilization?start=&end=` (SUPER_ADMIN)

---

## 7. ANALYTICS SERVICE LAYER

| Method | Product | Purpose |
|--------|---------|---------|
| `getDenAnalytics(year, month)` | DEN | GMV, monthlyRevenue, activeTenants, monthlyGrowth, revenuePerTenant |
| `getSlotUtilization(start, end)` | DEN | Utilization %, peak hours |
| `getFacilityRevenue(facilityId, start, end)` | LINEUP | totalRevenue, occupancyByDate (heatmap data) |
| `getUserBookingAnalytics(userId)` | SLATE | totalBookings, repeatRate, bookingFrequency |

**Endpoints:**

- `GET /analytics/den?year=&month=` – Den dashboard (SUPER_ADMIN)
- `GET /analytics/utilization?start=&end=` – Slot metrics (SUPER_ADMIN)
- `GET /analytics/facility/:facilityId?start=&end=` – Lineup revenue (FACILITY_ADMIN, SUPER_ADMIN)
- `GET /analytics/user/me` – Slate user stats (authenticated user)

---

## 8. AUDIT LOGGING

**AuditService.log()** – used for:

- Booking cancellation
- Booking completed / no-show
- Refund approved / rejected / processed

**Actions:** `BOOKING_CANCELLED`, `BOOKING_COMPLETED`, `BOOKING_NO_SHOW`, `REFUND_APPROVED`, `REFUND_REJECTED`, `REFUND_PROCESSED`, `COMMISSION_CHANGED`, `FACILITY_APPROVED`, `ROLE_CHANGED`

---

## 9. CLEAN ARCHITECTURE

| Check | Status |
|-------|--------|
| No business logic in controllers | ✅ Controllers delegate to services |
| No Prisma calls outside services | ⚠️ Stripe webhook uses Prisma (async event handler – acceptable) |
| Enums from shared types | ✅ BookingStatus, RefundStatus, UserRole from `types` |
| No magic strings | ✅ FacilityStatus.ACTIVE, AuditAction constants |
| Role checks centralized | ✅ RolesGuard, @Roles() decorator |
| DTO validation | ✅ class-validator on DTOs |
| Pagination | ✅ Bookings, refunds, facilities |

---

## 10. MIGRATION

```bash
cd packages/database
npx prisma generate
npx prisma db push   # or migrate
```

---

## 11. API SUMMARY

| Product | Key Endpoints |
|---------|---------------|
| **DEN** | `/analytics/den`, `/analytics/utilization`, `/commission/monthly` |
| **PLAYBALL** | `/refunds/pending`, `/refunds/:id/approve`, `/refunds/:id/reject` |
| **LINEUP** | `/bookings/tenant`, `/bookings/:id/complete`, `/bookings/:id/no-show`, `/analytics/facility/:id` |
| **SLATE** | `/bookings/lock`, `/bookings`, `/bookings/my`, `/analytics/user/me` |
