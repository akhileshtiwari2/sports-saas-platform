import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants(
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { facilities: true, users: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        facilities: { select: { id: true, name: true, status: true } },
        subscriptions: true,
        tenantSubscriptions: {
          include: { plan: true, scheduledPlan: true },
        },
        commissions: { where: { isActive: true } },
      },
    });
  }

  async listTenantSubscriptions(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.tenantSubscription.findMany({
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          plan: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tenantSubscription.count(),
    ]);
    return { items, total, page, limit };
  }
}
