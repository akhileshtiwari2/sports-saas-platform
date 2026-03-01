import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
export class SlotController {
  constructor(private readonly facility: FacilityService) {}

  @Post()
  async create(
    @Body() dto: { courtId: string; startTime: string; endTime: string; basePrice: number; weekendPrice?: number; isRecurring?: boolean; weeks?: number },
    @CurrentUser() user: { tenantId?: string },
  ) {
    return this.facility.createSlot(
      {
        courtId: dto.courtId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        basePrice: dto.basePrice,
        weekendPrice: dto.weekendPrice,
        isRecurring: dto.isRecurring,
        weeks: dto.weeks,
      },
      user.tenantId,
    );
  }

  @Delete('bulk')
  async bulkDelete(
    @Body() body: { slotIds: string[] },
    @CurrentUser() user: { tenantId?: string },
  ) {
    return this.facility.bulkDeleteSlots(body.slotIds, user.tenantId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: { tenantId?: string }) {
    return this.facility.deleteSlot(id, user.tenantId);
  }
}
