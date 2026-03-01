/**
 * API constants - Redis keys namespaced by tenantId for multi-tenant isolation
 */

export const SLOT_LOCK_TTL_SECONDS = 600; // 10 min to complete booking
export const REDIS_KEYS = {
  SLOT_LOCK: (tenantId: string, slotId: string) => `slot:lock:${tenantId}:${slotId}`,
  SLOT_BOOKING: (slotId: string, date: string) => `slot:booking:${slotId}:${date}`,
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,
} as const;

/** Rate limits */
export const RATE_LIMITS = {
  LOGIN_PER_MIN: 5,
  SLOT_LOCK_PER_MIN: 10,
  PAYMENT_INTENT_PER_MIN: 5,
} as const;
