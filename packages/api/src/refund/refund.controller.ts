import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refund: RefundService) {}

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SALES_ADMIN, UserRole.SUPER_ADMIN)
  async pending(
    @CurrentUser() user: { tenantId?: string; role?: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.refund.getPendingRefunds(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 20,
    );
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SALES_ADMIN)
  async approve(
    @Param('id') refundId: string,
    @Body('notes') notes: string,
    @CurrentUser() user: { sub: string; tenantId?: string },
  ) {
    return this.refund.approveRefund(refundId, user.sub, notes, user.tenantId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SALES_ADMIN)
  async reject(
    @Param('id') refundId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { sub: string; tenantId?: string },
  ) {
    return this.refund.rejectRefund(refundId, user.sub, reason, user.tenantId);
  }

  @Post(':id/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async process(
    @Param('id') refundId: string,
    @Body('stripeRefundId') stripeRefundId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.refund.processRefund(refundId, actorId, stripeRefundId);
  }
}
