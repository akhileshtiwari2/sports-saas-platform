/**
 * Shared Constants
 */

export const CANCELLATION_POLICIES = {
  FREE_UNTIL_24H: 'free_until_24h',
  HALF_REFUND_12H: 'half_refund_12h',
  NO_REFUND: 'no_refund',
} as const;

export const SLOT_LOCK_TTL_SECONDS = 300; // 5 minutes to complete booking
export const REDIS_KEYS = {
  SLOT_LOCK: (slotId: string) => `slot:lock:${slotId}`,
  SLOT_BOOKING: (slotId: string, date: string) => `slot:booking:${slotId}:${date}`,
  USER_SESSION: (userId: string) => `user:session:${userId}`,
} as const;
