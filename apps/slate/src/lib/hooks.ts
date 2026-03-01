'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './auth-store';
import { api } from './api';

export function useSearchFacilities(params?: { city?: string; sport?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['facilities', 'search', params],
    queryFn: () => api.searchFacilities({ ...params, limit: params?.limit ?? 12 }),
  });
}

export function useFacility(id: string | undefined) {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: () => api.getFacilityById(id!),
    enabled: !!id,
  });
}

export function useFacilitySlots(facilityId: string | undefined, start: string, end: string) {
  return useQuery({
    queryKey: ['facilitySlots', facilityId, start, end],
    queryFn: () => api.getFacilitySlots(facilityId!, start, end),
    enabled: !!facilityId && !!start && !!end,
  });
}

export function useMyBookings(params?: { status?: string; page?: number; limit?: number }) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['myBookings', params, !!token],
    queryFn: () => api.getMyBookings(token!, params),
    enabled: !!token,
  });
}

export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { slotId: string; facilityId?: string; courtId?: string; promoCode?: string; notes?: string }) =>
      api.createPaymentIntent(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      api.cancelBooking(token!, bookingId, reason, false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
  });
}
