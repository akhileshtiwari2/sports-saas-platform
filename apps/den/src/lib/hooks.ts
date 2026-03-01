'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './auth-store';
import {
  getDenAnalytics,
  getSlotUtilization,
  getCommissionMonthly,
  getCommissions,
  getTenants,
  getTenantById,
  getTenantSubscriptions,
  getAuditLogs,
} from './api';

export function useDenAnalytics(year: number, month: number) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['den-analytics', year, month],
    queryFn: () => getDenAnalytics(year, month, token!),
    enabled: !!token,
  });
}

export function useSlotUtilization(start: string, end: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['utilization', start, end],
    queryFn: () => getSlotUtilization(start, end, token!),
    enabled: !!token,
  });
}

export function useCommissionMonthly(year: number, month: number) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['commission-monthly', year, month],
    queryFn: () => getCommissionMonthly(year, month, token!),
    enabled: !!token,
  });
}

export function useCommissions(tenantId?: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['commissions', tenantId],
    queryFn: () => getCommissions(token!, tenantId),
    enabled: !!token,
  });
}

export function useTenants(params?: { page?: number; limit?: number; search?: string }) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => getTenants(token!, params),
    enabled: !!token,
  });
}

export function useTenant(id: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => getTenantById(id!, token!),
    enabled: !!token && !!id,
  });
}

export function useTenantSubscriptions(params?: { page?: number; limit?: number }) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['tenant-subscriptions', params],
    queryFn: () => getTenantSubscriptions(token!, params),
    enabled: !!token,
  });
}

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  tenantId?: string;
  start?: string;
  end?: string;
}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogs(token!, params),
    enabled: !!token,
  });
}
