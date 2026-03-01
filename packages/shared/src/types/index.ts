/**
 * Shared Types - Used across all apps
 */

export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  SalesAdmin = 'SalesAdmin',
  FacilityAdmin = 'FacilityAdmin',
  Coach = 'Coach',
  Customer = 'Customer',
}

export enum BookingStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
  NoShow = 'NoShow',
}

export enum FacilityStatus {
  Pending = 'Pending',
  Active = 'Active',
  Suspended = 'Suspended',
  Rejected = 'Rejected',
  Onboarding = 'Onboarding',
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}

export const PRODUCT_ROUTES = {
  DEN: '/den',
  PLAYBALL: '/playball',
  LINEUP: '/lineup',
  SLATE: '/slate',
} as const;
