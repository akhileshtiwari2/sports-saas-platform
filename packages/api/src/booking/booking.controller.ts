import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RateLimitScope } from '../common/guards/rate-limit.guard';
import { UserRole } from '@repo/types';
import { BookingStatus } from '@repo/types';
import { LockSlotDto } from './dto/lock-slot.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  private parseBookingStatus(status?: string): BookingStatus | undefined {
    if (!status) return undefined;
    if ((Object.values(BookingStatus) as string[]).includes(status)) {
      return status as BookingStatus;
    }
    throw new BadRequestException(`Invalid booking status: ${status}`);
  }

  @Post('lock')
  @UseGuards(RateLimitGuard)
  @RateLimit(RateLimitScope.SLOT_LOCK)
  async lockSlot(@Body() dto: LockSlotDto, @CurrentUser('sub') userId: string) {
    return this.booking.lockSlot(dto.slotId, userId);
  }

  /** SLATE: Create pending booking + Stripe PaymentIntent for checkout */
  @Post('create-payment-intent')
  @UseGuards(RateLimitGuard)
  @RateLimit(RateLimitScope.PAYMENT_INTENT)
  async createPaymentIntent(
    @Body() dto: { slotId: string; facilityId?: string; courtId?: string; promoCode?: string; notes?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.booking.createPaymentIntentForBooking(dto, userId);
  }

  @Get('my')
  async myBookings(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.booking.getBookingsByUser(
      userId,
      this.parseBookingStatus(status),
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 20,
    );
  }

  @Get('tenant')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.COACH, UserRole.SALES_ADMIN, UserRole.SUPER_ADMIN)
  async tenantBookings(
    @CurrentUser() user: { sub: string; tenantId?: string },
    @Query('facilityId') facilityId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user.tenantId) throw new BadRequestException('Tenant context required');
    return this.booking.getBookingsByTenant(
      user.tenantId,
      {
        facilityId,
        status: this.parseBookingStatus(status),
        search,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 20,
    );
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.COACH)
  async markCompleted(
    @Param('id') bookingId: string,
    @CurrentUser() user: { sub: string; role?: string; tenantId?: string },
  ) {
    return this.booking.markCompleted(
      bookingId,
      user.sub,
      user.role ?? 'FACILITY_ADMIN',
      user.tenantId,
    );
  }

  @Post(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.COACH)
  async markNoShow(
    @Param('id') bookingId: string,
    @CurrentUser() user: { sub: string; role?: string; tenantId?: string },
  ) {
    return this.booking.markNoShow(
      bookingId,
      user.sub,
      user.role ?? 'FACILITY_ADMIN',
      user.tenantId,
    );
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') bookingId: string,
    @Body('reason') reason: string,
    @Body('adminOverride') adminOverride: boolean,
    @CurrentUser() user: { sub: string; role?: UserRole },
  ) {
    const canOverride = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.SALES_ADMIN;
    return this.booking.cancelBooking(
      bookingId,
      user.sub,
      reason,
      canOverride && adminOverride === true,
    );
  }
}
