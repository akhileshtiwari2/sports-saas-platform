import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanEnforcementService } from '../subscriptions/plan-enforcement.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CoachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async getByTenant(tenantId: string) {
    return this.prisma.coach.findMany({
      where: { facility: { tenantId } },
      include: { facility: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    data: { facilityId: string; name: string; email?: string; phone?: string; bio?: string; hourlyRate?: number },
    tenantId?: string
  ) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: data.facilityId },
      select: { tenantId: true },
    });
    if (!facility) throw new BadRequestException('Facility not found');
    if (tenantId && facility.tenantId !== tenantId) {
      throw new ForbiddenException('Facility does not belong to your tenant');
    }
    if (tenantId) await this.planEnforcement.assertCoachLimit(tenantId);
    return this.prisma.coach.create({
      data: {
        facilityId: data.facilityId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        bio: data.bio,
        hourlyRate: data.hourlyRate != null ? new Decimal(data.hourlyRate) : null,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; email: string; phone: string; bio: string; hourlyRate: number; isActive: boolean }>, tenantId?: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      include: { facility: true },
    });
    if (!coach) throw new BadRequestException('Coach not found');
    if (tenantId && coach.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Coach does not belong to your tenant');
    }
    return this.prisma.coach.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.email != null && { email: data.email }),
        ...(data.phone != null && { phone: data.phone }),
        ...(data.bio != null && { bio: data.bio }),
        ...(data.hourlyRate != null && { hourlyRate: new Decimal(data.hourlyRate) }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
  }

  async toggleActive(id: string, tenantId?: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      include: { facility: true },
    });
    if (!coach) throw new BadRequestException('Coach not found');
    if (tenantId && coach.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Coach does not belong to your tenant');
    }
    return this.prisma.coach.update({
      where: { id },
      data: { isActive: !coach.isActive },
    });
  }
}
