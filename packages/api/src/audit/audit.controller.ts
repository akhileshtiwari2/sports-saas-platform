import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('tenantId') tenantId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (tenantId) where.tenantId = tenantId;
    if (start || end) {
      where.createdAt = {};
      if (start) (where.createdAt as Record<string, Date>).gte = new Date(start);
      if (end) (where.createdAt as Record<string, Date>).lte = new Date(end);
    }

    const skip = page ? (parseInt(page, 10) - 1) * (limit ? parseInt(limit, 10) : 20) : 0;
    const take = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: page ? parseInt(page, 10) : 1, limit: take };
  }
}
