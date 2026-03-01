import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly commission: CommissionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async list(@Query('tenantId') tenantId?: string) {
    return this.commission.listCommissions(tenantId);
  }

  @Get('booking/:bookingId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SALES_ADMIN, UserRole.SUPER_ADMIN)
  async payoutForBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: { role?: UserRole; tenantId?: string },
  ) {
    const tenantScope = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.commission.getPayoutForBooking(bookingId, tenantScope);
  }

  @Get('monthly')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async monthlyRevenue(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return { error: 'Invalid year or month' };
    }
    return this.commission.getMonthlyRevenueByTenant(y, m);
  }
}
