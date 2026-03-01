/**
 * API client for DEN dashboard - connects to real backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; user: unknown }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data;
}

// Analytics
export async function getDenAnalytics(year: number, month: number, token: string) {
  return apiFetch<{
    gmv: number;
    monthlyRevenue: number;
    activeTenants: number;
    monthlyGrowth: number;
    revenuePerTenant: number;
  }>(`/analytics/den?year=${year}&month=${month}`, {}, token);
}

export async function getSlotUtilization(start: string, end: string, token: string) {
  return apiFetch<{
    totalSlots: number;
    bookedSlots: number;
    utilizationPercent: number;
    peakHours: { hour: number; bookingCount: number }[];
  }>(`/analytics/utilization?start=${start}&end=${end}`, {}, token);
}

// Commission
export async function getCommissionMonthly(year: number, month: number, token: string) {
  return apiFetch<
    Array<{
      tenantId: string;
      month: string;
      totalBookings: number;
      grossRevenue: number;
      commissionAmount: number;
      netPayout: number;
    }>
  >(`/commission/monthly?year=${year}&month=${month}`, {}, token);
}

export async function getCommissions(token: string, tenantId?: string) {
  const q = tenantId ? `?tenantId=${tenantId}` : '';
  return apiFetch<
    Array<{
      id: string;
      tenantId: string;
      percentage: number | { toNumber?: () => number };
      facilityId: string | null;
    }>
  >(`/commission${q}`, {}, token);
}

// Tenants
export async function getTenants(
  token: string,
  params?: { page?: number; limit?: number; search?: string }
) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  const q = sp.toString() ? `?${sp}` : '';
  return apiFetch<{
    items: Array<{
      id: string;
      name: string;
      slug: string;
      createdAt: string;
      _count: { facilities: number; users: number };
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/tenants${q}`, {}, token);
}

export async function getTenantById(id: string, token: string) {
  return apiFetch<{
    id: string;
    name: string;
    slug: string;
    facilities: Array<{ id: string; name: string; status: string }>;
    subscriptions: unknown[];
    tenantSubscriptions?: Array<{
      id: string;
      status: string;
      plan: { name: string; priceMonthly: number; priceYearly: number };
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    }>;
    commissions: Array<{ id: string; percentage: number; facilityId: string | null }>;
  }>(`/tenants/${id}`, {}, token);
}

export async function getTenantSubscriptions(
  token: string,
  params?: { page?: number; limit?: number }
) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const q = sp.toString() ? `?${sp}` : '';
  return apiFetch<{
    items: Array<{
      id: string;
      tenantId: string;
      status: string;
      plan: { name: string; priceMonthly: number; priceYearly: number };
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      tenant: { id: string; name: string; slug: string };
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/tenants/subscriptions${q}`, {}, token);
}

// Audit logs
export async function getAuditLogs(
  token: string,
  params?: { page?: number; limit?: number; action?: string; tenantId?: string; start?: string; end?: string }
) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.action) sp.set('action', params.action);
  if (params?.tenantId) sp.set('tenantId', params.tenantId);
  if (params?.start) sp.set('start', params.start);
  if (params?.end) sp.set('end', params.end);
  const q = sp.toString() ? `?${sp}` : '';
  return apiFetch<{
    items: Array<{
      id: string;
      actorId: string;
      actorRole: string;
      tenantId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      metadata: unknown;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/audit-logs${q}`, {}, token);
}
