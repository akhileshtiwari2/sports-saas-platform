import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('courts')
export class CourtController {
  constructor(private readonly facility: FacilityService) {}

  @Get('tenant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async getByTenant(@CurrentUser() user: { tenantId?: string }, @Query('facilityId') facilityId?: string) {
    if (!user.tenantId) return [];
    return this.facility.getCourtsByTenant(user.tenantId, facilityId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async create(
    @Body() body: { facilityId: string; name: string; sportType?: string; description?: string },
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.facility.createCourt(body, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; sportType: string; description: string; isActive: boolean }>,
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.facility.updateCourt(id, body, user.tenantId);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async toggleActive(@Param('id') id: string, @CurrentUser() user: { tenantId?: string }) {
    return this.facility.toggleCourtActive(id, user.tenantId);
  }

  @Get(':courtId/slots')
  @UseGuards(JwtAuthGuard)
  async getSlots(
    @Param('courtId') courtId: string,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.facility.getAvailableSlots(courtId, date);
  }
}
