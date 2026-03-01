import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@repo/types';
import { BOOKING_TRANSITIONS } from '@repo/types';

/**
 * Centralized booking state machine.
 * Enforces: PENDING->CONFIRMED|CANCELLED, CONFIRMED->CANCELLED|COMPLETED|NO_SHOW
 */
export class BookingStateService {
  /**
   * Validates and returns new status. Throws if transition invalid.
   */
  static validateTransition(from: BookingStatus, to: BookingStatus): void {
    const allowed = BOOKING_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid booking transition: ${from} -> ${to}. Allowed: ${allowed?.join(', ') ?? 'none'}`,
      );
    }
  }

  static canTransition(from: BookingStatus, to: BookingStatus): boolean {
    const allowed = BOOKING_TRANSITIONS[from];
    return !!allowed?.includes(to);
  }
}
