import { Controller, Get, Param, Query, Body, Patch, UseGuards } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, CancellationPolicy } from '@repo/types';

@Controller('facilities')
export class FacilityController {
  constructor(private readonly facility: FacilityService) {}

  /** LINEUP: List facilities for current user's tenant */
  @Get('tenant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.COACH, UserRole.SALES_ADMIN, UserRole.SUPER_ADMIN)
  async getMyFacilities(@CurrentUser() user: { tenantId?: string }) {
    if (!user.tenantId) return [];
    return this.facility.getFacilitiesByTenant(user.tenantId);
  }

  @Get('search')
  @Public()
  async search(
    @Query('city') city?: string,
    @Query('sport') sportType?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.facility.searchFacilities(
      city,
      sportType,
      limit ? parseInt(limit, 10) : 20,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async updateSettings(
    @Param('id') facilityId: string,
    @Body() body: { cancellationPolicy?: CancellationPolicy; weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number },
    @CurrentUser() user: { tenantId?: string }
  ) {
    const settings: Record<string, number> = {};
    if (body.weekendPricingPercent != null) settings.weekendPricingPercent = body.weekendPricingPercent;
    if (body.defaultSlotDuration != null) settings.defaultSlotDuration = body.defaultSlotDuration;
    if (body.taxPercent != null) settings.taxPercent = body.taxPercent;
    return this.facility.updateFacilitySettings(
      facilityId,
      { cancellationPolicy: body.cancellationPolicy, settings: Object.keys(settings).length ? settings : undefined },
      user.tenantId
    );
  }

  /** LINEUP + SLATE: Slots for facility in date range (public for marketplace browsing) */
  @Get(':id/slots')
  @Public()
  async getFacilitySlots(
    @Param('id') facilityId: string,
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
  ) {
    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr ? new Date(startStr) : new Date(new Date().setDate(1));
    return this.facility.getSlotsByFacility(facilityId, start, end);
  }

  /** LINEUP internal slot feed with booking/court joins (authenticated only). */
  @Get(':id/internal-slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.COACH, UserRole.SALES_ADMIN, UserRole.SUPER_ADMIN)
  async getFacilityInternalSlots(
    @Param('id') facilityId: string,
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
  ) {
    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr ? new Date(startStr) : new Date(new Date().setDate(1));
    return this.facility.getSlotsByFacilityInternal(facilityId, start, end);
  }

  @Get(':id')
  @Public()
  async getById(@Param('id') id: string) {
    return this.facility.getFacilityById(id);
  }
}

