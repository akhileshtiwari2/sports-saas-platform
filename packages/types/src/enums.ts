/**
 * Shared enums - used across API and frontend apps
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SALES_ADMIN = 'SALES_ADMIN',
  FACILITY_ADMIN = 'FACILITY_ADMIN',
  COACH = 'COACH',
  CUSTOMER = 'CUSTOMER',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum FacilityStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  ONBOARDING = 'ONBOARDING',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum CancellationPolicy {
  FREE_UNTIL_24H = 'FREE_UNTIL_24H',
  HALF_REFUND_12H = 'HALF_REFUND_12H',
  NO_REFUND = 'NO_REFUND',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  TRIALING = 'TRIALING',
}

/** Allowed booking state transitions */
export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
} as const;

/** Allowed refund state transitions */
export const REFUND_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSED'],
  REJECTED: [],
  PROCESSED: [],
} as const;
