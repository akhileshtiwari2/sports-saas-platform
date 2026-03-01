import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for creating a booking
 */
export class CreateBookingDto {
  @IsUUID()
  slotId: string;

  @IsUUID()
  facilityId: string;

  @IsUUID()
  courtId: string;

  @IsString()
  lockToken: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
