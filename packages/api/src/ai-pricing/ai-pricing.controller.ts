import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AIPricingService } from './ai-pricing.service';
import { FeatureService } from '../subscriptions/feature.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';

@Controller('ai-pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
export class AIPricingController {
  constructor(
    private readonly aiPricing: AIPricingService,
    private readonly feature: FeatureService,
  ) {}

  @Get('suggest/:slotId')
  async suggest(
    @Param('slotId') slotId: string,
    @CurrentUser() user: { tenantId?: string; role?: string },
  ) {
    if (user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      await this.feature.assertAIPricing(user.tenantId);
    }
    return this.aiPricing.getPricingSuggestions(slotId, user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId);
  }

  @Post('apply/:slotId')
  async apply(
    @Param('slotId') slotId: string,
    @Body('apply') apply: boolean,
    @CurrentUser() user: { tenantId?: string; role?: string },
  ) {
    if (user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      await this.feature.assertAIPricing(user.tenantId);
    }
    return this.aiPricing.applySuggestion(
      slotId,
      apply ?? false,
      user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId,
    );
  }
}
