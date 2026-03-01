const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? res.statusText);
  }
  return res.json();
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string | null;
}

export interface Facility {
  id: string;
  name: string;
  address?: string;
  city?: string;
  courts?: Court[];
}

export interface Court {
  id: string;
  name: string;
  facilityId: string;
}

export interface Slot {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  basePrice?: number;
  weekendPrice?: number | null;
  isBooked?: boolean;
  bookingInfo?: unknown;
}

export interface Booking {
  id: string;
  facilityId: string;
  facilityName?: string;
  courtId?: string;
  courtName?: string;
  slotId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  date: string;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  price?: string | number;
  status?: string;
  createdAt?: string;
}

export interface FacilityAnalytics {
  facilityId: string;
  start: string;
  end: string;
  [key: string]: unknown;
}

export interface CreateSlotInput {
  courtId: string;
  startTime: string;
  endTime: string;
  basePrice?: number;
  weekendPrice?: number | null;
  weeks?: number;
}

export interface Coach {
  id: string;
  facilityId: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  hourlyRate?: number;
  isActive: boolean;
}

export interface Lesson {
  id: string;
  coachId: string;
  courtId: string;
  slotId: string;
  title: string;
  maxStudents: number;
  price: number;
  status: string;
  startTime: string;
  endTime: string;
  coach?: { id: string; name: string };
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMyFacilities: (token: string) =>
    apiFetch<Facility[]>('/facilities/tenant', { token }),

  getFacilitySlots: (token: string, facilityId: string, start: string, end: string) =>
    apiFetch<Slot[]>(`/facilities/${facilityId}/internal-slots?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { token }),

  getFacilityById: (token: string, facilityId: string) =>
    apiFetch<Facility>(`/facilities/${facilityId}`, { token }),

  getCourtSlots: (token: string, courtId: string, date: string) =>
    apiFetch<Slot[]>(`/courts/${courtId}/slots?date=${encodeURIComponent(date)}`, { token }),

  getTenantBookings: (token: string, params?: { facilityId?: string; status?: string; search?: string; start?: string; end?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.facilityId) sp.set('facilityId', params.facilityId);
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    if (params?.start) sp.set('start', params.start);
    if (params?.end) sp.set('end', params.end);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return apiFetch<{ items: Booking[]; total: number }>(`/bookings/tenant${q ? `?${q}` : ''}`, { token });
  },

  completeBooking: (token: string, bookingId: string) =>
    apiFetch<Booking>(`/bookings/${bookingId}/complete`, { method: 'POST', token }),

  noShowBooking: (token: string, bookingId: string) =>
    apiFetch<Booking>(`/bookings/${bookingId}/no-show`, { method: 'POST', token }),

  cancelBooking: (token: string, bookingId: string, reason?: string, adminOverride?: boolean) =>
    apiFetch<unknown>(`/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason, adminOverride }), token }),

  getFacilityAnalytics: (token: string, facilityId: string, start: string, end: string) =>
    apiFetch<FacilityAnalytics>(`/analytics/facility/${facilityId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { token }),

  createSlot: (token: string, slot: CreateSlotInput) =>
    apiFetch<Slot | Slot[]>('/slots', { method: 'POST', body: JSON.stringify(slot), token }),

  bulkDeleteSlots: (token: string, slotIds: string[]) =>
    apiFetch<{ deleted: number; failed: string[] }>('/slots/bulk', { method: 'DELETE', body: JSON.stringify({ slotIds }), token }),

  deleteSlot: (token: string, slotId: string) =>
    apiFetch<unknown>(`/slots/${slotId}`, { method: 'DELETE', token }),

  updateFacilitySettings: (token: string, facilityId: string, data: { cancellationPolicy?: string; weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number }) =>
    apiFetch<unknown>(`/facilities/${facilityId}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  getCoaches: (token: string) => apiFetch<Coach[]>('/coaches/tenant', { token }),
  createCoach: (token: string, data: { facilityId: string; name: string; email?: string; phone?: string; bio?: string; hourlyRate?: number }) =>
    apiFetch<Coach>('/coaches', { method: 'POST', body: JSON.stringify(data), token }),
  toggleCoachActive: (token: string, id: string) =>
    apiFetch<Coach>(`/coaches/${id}/toggle-active`, { method: 'PATCH', token }),

  getCourts: (token: string, facilityId?: string) => {
    const q = facilityId ? `?facilityId=${facilityId}` : '';
    return apiFetch<Court[]>(`/courts/tenant${q}`, { token });
  },
  createCourt: (token: string, data: { facilityId: string; name: string; sportType?: string; description?: string }) =>
    apiFetch<Court>('/courts', { method: 'POST', body: JSON.stringify(data), token }),
  toggleCourtActive: (token: string, id: string) =>
    apiFetch<Court>(`/courts/${id}/toggle-active`, { method: 'PATCH', token }),

  getLessons: (token: string, facilityId?: string) => {
    const q = facilityId ? `?facilityId=${facilityId}` : '';
    return apiFetch<Lesson[]>(`/lessons/tenant${q}`, { token });
  },
  createLesson: (token: string, data: { coachId: string; courtId: string; slotId: string; title: string; description?: string; maxStudents?: number; price: number; startTime: string; endTime: string }) =>
    apiFetch<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(data), token }),

  // Subscriptions
  getPlans: (token?: string | null) => apiFetch<Plan[]>(`/subscriptions/plans`, { token: token ?? undefined }),
  getMySubscription: (token: string) => apiFetch<Subscription | null>('/subscriptions/me', { token }),
  getUsage: (token: string) => apiFetch<Usage | null>('/subscriptions/usage', { token }),
  createCheckoutSession: (token: string, data: { planId: string; billingInterval: 'monthly' | 'yearly' }) =>
    apiFetch<{ url: string; sessionId: string }>('/subscriptions/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

export interface Plan {
  id: string;
  name: string;
  maxCourts: number;
  maxCoaches: number;
  maxBookingsPerMonth: number;
  features: Record<string, boolean>;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan: Plan;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId?: string | null;
}

export interface Usage {
  courts: number;
  coaches: number;
  bookingsThisMonth: number;
  limits: Plan['features'] & { maxCourts: number; maxCoaches: number; maxBookingsPerMonth: number; planName: string };
}
