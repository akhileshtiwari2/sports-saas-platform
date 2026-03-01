/**
 * Auth-related types
 */

import type { UserRole } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  facilityId?: string;
  iat?: number;
  exp?: number;
}

/** @deprecated Use JwtPayload */
export type JWTPayload = JwtPayload;

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}
