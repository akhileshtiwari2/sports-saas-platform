import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { CoachesService } from './coaches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from 'types';

@Controller('coaches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN)
export class CoachesController {
  constructor(private readonly coaches: CoachesService) {}

  @Get('tenant')
  async getByTenant(@CurrentUser() user: { tenantId?: string }) {
    if (!user.tenantId) return [];
    return this.coaches.getByTenant(user.tenantId);
  }

  @Post()
  async create(
    @Body() body: { facilityId: string; name: string; email?: string; phone?: string; bio?: string; hourlyRate?: number },
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.coaches.create(body, user.tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; email: string; phone: string; bio: string; hourlyRate: number; isActive: boolean }>,
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.coaches.update(id, body, user.tenantId);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string, @CurrentUser() user: { tenantId?: string }) {
    return this.coaches.toggleActive(id, user.tenantId);
  }
}
