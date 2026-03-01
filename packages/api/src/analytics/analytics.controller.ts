import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FeatureService } from '../subscriptions/feature.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly feature: FeatureService,
  ) {}

  /** Den: GMV, active tenants, monthly growth, revenue per tenant */
  @Get('den')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async denAnalytics(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year ?? new Date().getFullYear().toString(), 10);
    const m = parseInt(month ?? new Date().getMonth().toString(), 10) || new Date().getMonth() + 1;
    return this.analytics.getDenAnalytics(y, m);
  }

  /** Den: Slot utilization and peak hours */
  @Get('utilization')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async slotUtilization(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end ? new Date(end) : new Date();
    return this.analytics.getSlotUtilization(startDate, endDate);
  }

  /** Lineup: Facility revenue and occupancy (requires analytics feature) */
  @Get('facility/:facilityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async facilityRevenue(
    @Param('facilityId') facilityId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @CurrentUser() user: { tenantId?: string; role?: string },
  ) {
    if (user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      await this.feature.assertAnalytics(user.tenantId);
    }
    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end ? new Date(end) : new Date();
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.analytics.getFacilityRevenue(facilityId, startDate, endDate, tenantId);
  }

  /** Slate: User booking frequency */
  @Get('user/me')
  async myBookingStats(@CurrentUser('sub') userId: string) {
    return this.analytics.getUserBookingAnalytics(userId);
  }
}
