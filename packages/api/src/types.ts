export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  SalesAdmin = 'SalesAdmin',
  FacilityAdmin = 'FacilityAdmin',
  Coach = 'Coach',
  Customer = 'Customer',
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  iat?: number;
  exp?: number;
}
