import { IsUUID } from 'class-validator';

/**
 * DTO for locking a slot
 */
export class LockSlotDto {
  @IsUUID()
  slotId: string;
}
