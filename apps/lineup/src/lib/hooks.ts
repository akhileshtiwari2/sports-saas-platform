'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './auth-store';
import { api, type CreateSlotInput } from './api';

// Facilities
export function useMyFacilities() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['myFacilities'],
    queryFn: () => api.getMyFacilities(token!),
    enabled: !!token,
  });
}

export function useFacilitySlots(facilityId: string | undefined, start: string, end: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['facilitySlots', facilityId, start, end],
    queryFn: () => api.getFacilitySlots(token!, facilityId!, start, end),
    enabled: !!token && !!facilityId,
  });
}

export function useFacilityById(facilityId: string | undefined) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['facility', facilityId],
    queryFn: () => api.getFacilityById(token!, facilityId!),
    enabled: !!token && !!facilityId,
  });
}

export function useCourtSlots(courtId: string | undefined, date: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['courtSlots', courtId, date],
    queryFn: () => api.getCourtSlots(token!, courtId!, date),
    enabled: !!token && !!courtId && !!date,
  });
}

// Tenant bookings
export function useTenantBookings(params?: {
  facilityId?: string;
  status?: string;
  search?: string;
  start?: string;
  end?: string;
  page?: number;
  limit?: number;
}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['tenantBookings', params],
    queryFn: () => api.getTenantBookings(token!, params),
    enabled: !!token,
  });
}

// Facility analytics
export function useFacilityAnalytics(
  facilityId: string | undefined,
  start: string,
  end: string
) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['facilityAnalytics', facilityId, start, end],
    queryFn: () => api.getFacilityAnalytics(token!, facilityId!, start, end),
    enabled: !!token && !!facilityId && !!start && !!end,
  });
}

function optimisticStatusUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId: string,
  newStatus: string,
) {
  const qk = ['tenantBookings'];
  const prev = queryClient.getQueriesData<{ items: Array<{ id: string; status?: string }>; total: number }>({ queryKey: qk });
  queryClient.setQueriesData({ queryKey: qk }, (old: { items: Array<{ id: string; status?: string }>; total: number } | undefined) => {
    if (!old) return old;
    return {
      ...old,
      items: old.items.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
    };
  });
  return prev;
}

// Mutations
export function useCompleteBooking() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (bookingId: string) => api.completeBooking(token!, bookingId),
    onMutate: async (bookingId) => {
      const prev = optimisticStatusUpdate(queryClient, bookingId, 'COMPLETED');
      return { prev };
    },
    onError: (_err, _bookingId, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]) => queryClient.setQueryData(k, v));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tenantBookings'] }),
  });
}

export function useNoShowBooking() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (bookingId: string) => api.noShowBooking(token!, bookingId),
    onMutate: async (bookingId) => {
      const prev = optimisticStatusUpdate(queryClient, bookingId, 'NO_SHOW');
      return { prev };
    },
    onError: (_err, _bookingId, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]) => queryClient.setQueryData(k, v));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tenantBookings'] }),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      api.cancelBooking(token!, bookingId, reason),
    onMutate: async ({ bookingId }) => {
      const prev = optimisticStatusUpdate(queryClient, bookingId, 'CANCELLED');
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]) => queryClient.setQueryData(k, v));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tenantBookings'] }),
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (slot: CreateSlotInput) => api.createSlot(token!, slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilitySlots'] });
      queryClient.invalidateQueries({ queryKey: ['courtSlots'] });
    },
  });
}

export function useBulkDeleteSlots() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (slotIds: string[]) => api.bulkDeleteSlots(token!, slotIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilitySlots'] });
    },
  });
}

export function useUpdateFacilitySettings(facilityId: string | undefined) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { cancellationPolicy?: string; weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number }) =>
      api.updateFacilitySettings(token!, facilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['myFacilities'] });
    },
  });
}

export function useCoaches(facilityId?: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['coaches', facilityId],
    queryFn: () => api.getCoaches(token!),
    enabled: !!token,
  });
}

export function useCreateCoach() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { facilityId: string; name: string; email?: string; phone?: string; bio?: string; hourlyRate?: number }) =>
      api.createCoach(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches'] }),
  });
}

export function useToggleCoachActive() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (id: string) => api.toggleCoachActive(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches'] }),
  });
}

export function useCourts(facilityId?: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['courts', facilityId],
    queryFn: () => api.getCourts(token!, facilityId),
    enabled: !!token,
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { facilityId: string; name: string; sportType?: string; description?: string }) =>
      api.createCourt(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      queryClient.invalidateQueries({ queryKey: ['myFacilities'] });
    },
  });
}

export function useToggleCourtActive() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (id: string) => api.toggleCourtActive(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      queryClient.invalidateQueries({ queryKey: ['myFacilities'] });
    },
  });
}

export function useLessons(facilityId?: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['lessons', facilityId],
    queryFn: () => api.getLessons(token!, facilityId),
    enabled: !!token,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { coachId: string; courtId: string; slotId: string; title: string; description?: string; maxStudents?: number; price: number; startTime: string; endTime: string }) =>
      api.createLesson(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

// Subscriptions
export function useSubscription() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getMySubscription(token!),
    enabled: !!token,
  });
}

export function useUsage() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => api.getUsage(token!),
    enabled: !!token,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { planId: string; billingInterval: 'monthly' | 'yearly' }) =>
      api.createCheckoutSession(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription', 'usage'] }),
  });
}
