import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlanEnforcementService } from './plan-enforcement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@repo/types';
import { Public } from '../auth/decorators/public.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  /** List plans - public for pricing page */
  @Get('plans')
  @Public()
  async getPlans() {
    return this.subscriptions.getPlans();
  }

  /** Current tenant subscription - LINEUP */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async getMySubscription(@CurrentUser() user: { tenantId?: string }) {
    if (!user.tenantId) return null;
    return this.subscriptions.getTenantSubscription(user.tenantId);
  }

  /** Current usage vs limits - LINEUP */
  @Get('usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async getUsage(@CurrentUser() user: { tenantId?: string }) {
    if (!user.tenantId) return null;
    return this.planEnforcement.getUsage(user.tenantId);
  }

  /** Create checkout session - redirect to Stripe */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async createCheckoutSession(
    @Body() body: { planId: string; billingInterval: 'monthly' | 'yearly'; successUrl?: string; cancelUrl?: string },
    @CurrentUser() user: { tenantId?: string },
  ) {
    if (!user.tenantId) throw new BadRequestException('Tenant required');
    return this.subscriptions.createCheckoutSession(user.tenantId, body);
  }

  /** Request downgrade at period end */
  @Post('downgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async requestDowngrade(
    @Body() body: { targetPlanId: string },
    @CurrentUser() user: { tenantId?: string },
  ) {
    if (!user.tenantId) throw new BadRequestException('Tenant required');
    return this.subscriptions.requestDowngrade(user.tenantId, body.targetPlanId);
  }

  /** Cancel downgrade request */
  @Post('cancel-downgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
  async cancelDowngrade(@CurrentUser() user: { tenantId?: string }) {
    if (!user.tenantId) throw new BadRequestException('Tenant required');
    return this.subscriptions.cancelDowngradeRequest(user.tenantId);
  }
}
