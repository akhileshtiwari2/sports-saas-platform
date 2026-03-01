const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiFetchOptions = RequestInit & { token?: string | null };

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...init.headers };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

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
  phone?: string | null;
  role?: string;
}

export interface Facility {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  cancellationPolicy?: string | null;
  courts?: Court[];
  _count?: { reviews: number };
}

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  sportType: string;
}

export interface Slot {
  slotId: string;
  startTime: string;
  endTime: string;
  availability: 'AVAILABLE' | 'BOOKED';
}

export interface Booking {
  id: string;
  facilityId: string;
  courtId?: string;
  slotId: string;
  status: string;
  totalAmount: number | string;
  currency?: string;
  facility?: Facility;
  court?: Court;
  slot?: Slot;
  createdAt?: string;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    apiFetch<{ accessToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role: 'CUSTOMER' }),
    }),

  searchFacilities: (params?: { city?: string; sport?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.city) sp.set('city', params.city);
    if (params?.sport) sp.set('sport', params.sport);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return apiFetch<Facility[]>(`/facilities/search${q ? `?${q}` : ''}`);
  },

  getFacilityById: (id: string) => apiFetch<Facility>(`/facilities/${id}`),

  getFacilitySlots: (facilityId: string, start: string, end: string) =>
    apiFetch<Slot[]>(`/facilities/${facilityId}/slots?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),

  createPaymentIntent: (
    token: string,
    data: { slotId: string; facilityId?: string; courtId?: string; promoCode?: string; notes?: string }
  ) =>
    apiFetch<{ clientSecret: string; bookingId: string }>('/bookings/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getMyBookings: (token: string, params?: { status?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return apiFetch<{ items: Booking[]; total: number; page: number; limit: number }>(
      `/bookings/my${q ? `?${q}` : ''}`,
      { token }
    );
  },

  cancelBooking: (token: string, bookingId: string, reason?: string, adminOverride?: boolean) =>
    apiFetch<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, adminOverride }),
      token,
    }),
};
