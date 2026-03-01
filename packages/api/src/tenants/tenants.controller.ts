import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.tenants.listTenants(
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 20,
      search,
    );
  }

  @Get('subscriptions')
  async listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenants.listTenantSubscriptions(
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 50,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.tenants.getTenantById(id);
  }
}
