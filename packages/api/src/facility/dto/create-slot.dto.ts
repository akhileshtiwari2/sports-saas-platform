import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  courtId: string;

  @IsString()
  startTime: string; // ISO date string

  @IsString()
  endTime: string;

  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsNumber()
  weekendPrice?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
