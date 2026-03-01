import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanEnforcementService } from '../subscriptions/plan-enforcement.service';
import { FacilityStatus, CancellationPolicy } from '@repo/types';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FacilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async searchFacilities(
    city?: string,
    sportType?: string,
    limit = 20,
    page = 1,
  ) {
    const where: Record<string, unknown> = { status: FacilityStatus.ACTIVE };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (sportType) {
      where.courts = { some: { sportType: { contains: sportType, mode: 'insensitive' } } };
    }
    const skip = (page - 1) * limit;
    return this.prisma.facility.findMany({
      where,
      include: {
        courts: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
      take: limit,
      skip,
      orderBy: { name: 'asc' },
    });
  }

  async getFacilityById(id: string) {
    return this.prisma.facility.findUnique({
      where: { id },
      include: {
        courts: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
    });
  }

  async getFacilitiesByTenant(tenantId: string) {
    return this.prisma.facility.findMany({
      where: { tenantId, status: FacilityStatus.ACTIVE },
      include: {
        courts: { where: { isActive: true } },
        _count: { select: { courts: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSlotsByFacility(facilityId: string, start: Date, end: Date) {
    return this.prisma.slot.findMany({
      where: {
        court: { facilityId },
        startTime: { gte: start, lte: end },
        isActive: true,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        isBooked: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    }).then((slots) =>
      slots.map((slot) => ({
        slotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        availability: slot.isBooked || slot.status !== 'AVAILABLE' ? 'BOOKED' : 'AVAILABLE',
      })),
    );
  }

  async getSlotsByFacilityInternal(facilityId: string, start: Date, end: Date) {
    return this.prisma.slot.findMany({
      where: {
        court: { facilityId },
        startTime: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        court: true,
        bookings: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async createSlot(data: {
    courtId: string;
    startTime: Date;
    endTime: Date;
    basePrice: number;
    weekendPrice?: number;
    isRecurring?: boolean;
    weeks?: number;
  }, tenantId?: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: data.courtId },
      include: { facility: true },
    });
    if (!court) throw new BadRequestException('Court not found');
    if (tenantId && court.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Court does not belong to your tenant');
    }
    if (tenantId) await this.planEnforcement.assertSlotLimit(tenantId);
    if (data.weeks && data.weeks > 1) {
      const created: Awaited<ReturnType<typeof this.prisma.slot.create>>[] = [];
      for (let w = 0; w < data.weeks; w++) {
        const start = new Date(data.startTime);
        start.setDate(start.getDate() + w * 7);
        const end = new Date(data.endTime);
        end.setDate(end.getDate() + w * 7);
        const s = await this.prisma.slot.create({
          data: {
            courtId: data.courtId,
            startTime: start,
            endTime: end,
            basePrice: new Decimal(data.basePrice),
            weekendPrice: data.weekendPrice != null ? new Decimal(data.weekendPrice) : null,
            isRecurring: true,
          },
          include: { court: true },
        });
        created.push(s);
      }
      return created;
    }
    const existing = await this.prisma.slot.findUnique({
      where: { courtId_startTime: { courtId: data.courtId, startTime: data.startTime } },
    });
    if (existing) throw new BadRequestException('Slot already exists at this time');
    return this.prisma.slot.create({
      data: {
        courtId: data.courtId,
        startTime: data.startTime,
        endTime: data.endTime,
        basePrice: new Decimal(data.basePrice),
        weekendPrice: data.weekendPrice != null ? new Decimal(data.weekendPrice) : null,
        isRecurring: data.isRecurring ?? false,
      },
      include: { court: true },
    });
  }

  async deleteSlot(slotId: string, tenantId?: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { court: { include: { facility: true } }, bookings: true },
    });
    if (!slot) throw new BadRequestException('Slot not found');
    if (tenantId && slot.court.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Slot does not belong to your tenant');
    }
    if (slot.bookings.length > 0) throw new BadRequestException('Cannot delete slot with active bookings');
    if (!tenantId) {
      return this.prisma.slot.delete({ where: { id: slotId } });
    }
    const deleted = await this.prisma.slot.deleteMany({
      where: { id: slotId, court: { facility: { tenantId } } },
    });
    if (deleted.count !== 1) throw new ForbiddenException('Slot does not belong to your tenant');
    return { id: slotId, deleted: true };
  }

  async bulkDeleteSlots(slotIds: string[], tenantId?: string) {
    const results: { deleted: number; failed: string[] } = { deleted: 0, failed: [] };
    for (const id of slotIds) {
      try {
        await this.deleteSlot(id, tenantId);
        results.deleted++;
      } catch {
        results.failed.push(id);
      }
    }
    return results;
  }

  async getCourtsByTenant(tenantId: string, facilityId?: string) {
    const where: Record<string, unknown> = { facility: { tenantId } };
    if (facilityId) where.facilityId = facilityId;
    return this.prisma.court.findMany({
      where,
      include: { facility: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCourt(data: { facilityId: string; name: string; sportType?: string; description?: string }, tenantId?: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: data.facilityId },
      select: { tenantId: true },
    });
    if (!facility) throw new BadRequestException('Facility not found');
    if (tenantId && facility.tenantId !== tenantId) {
      throw new ForbiddenException('Facility does not belong to your tenant');
    }
    if (tenantId) await this.planEnforcement.assertCourtLimit(tenantId);
    return this.prisma.court.create({
      data: {
        facilityId: data.facilityId,
        name: data.name,
        sportType: data.sportType ?? 'General',
        description: data.description,
      },
    });
  }

  async updateCourt(id: string, data: Partial<{ name: string; sportType: string; description: string; isActive: boolean }>, tenantId?: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { facility: true },
    });
    if (!court) throw new BadRequestException('Court not found');
    if (tenantId && court.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Court does not belong to your tenant');
    }
    const updateData = {
      ...(data.name != null && { name: data.name }),
      ...(data.sportType != null && { sportType: data.sportType }),
      ...(data.description != null && { description: data.description }),
      ...(data.isActive != null && { isActive: data.isActive }),
    };
    if (!tenantId) {
      return this.prisma.court.update({ where: { id }, data: updateData });
    }
    const updated = await this.prisma.court.updateMany({
      where: { id, facility: { tenantId } },
      data: updateData,
    });
    if (updated.count !== 1) throw new ForbiddenException('Court does not belong to your tenant');
    return this.prisma.court.findUnique({ where: { id } });
  }

  async toggleCourtActive(id: string, tenantId?: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { facility: true },
    });
    if (!court) throw new BadRequestException('Court not found');
    if (tenantId && court.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Court does not belong to your tenant');
    }
    if (!tenantId) {
      return this.prisma.court.update({
        where: { id },
        data: { isActive: !court.isActive },
      });
    }
    const updated = await this.prisma.court.updateMany({
      where: { id, facility: { tenantId } },
      data: { isActive: !court.isActive },
    });
    if (updated.count !== 1) throw new ForbiddenException('Court does not belong to your tenant');
    return this.prisma.court.findUnique({ where: { id } });
  }

  async updateFacilitySettings(
    id: string,
    data: {
      cancellationPolicy?: CancellationPolicy;
      settings?: { weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number };
    },
    tenantId?: string
  ) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
    });
    if (!facility) throw new BadRequestException('Facility not found');
    if (tenantId && facility.tenantId !== tenantId) {
      throw new ForbiddenException('Facility does not belong to your tenant');
    }
    const update: Record<string, unknown> = {};
    if (data.cancellationPolicy) update.cancellationPolicy = data.cancellationPolicy;
    if (data.settings) update.settings = data.settings;
    return this.prisma.facility.update({
      where: { id },
      data: update,
    });
  }

  async getAvailableSlots(courtId: string, date: Date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    return this.prisma.slot.findMany({
      where: {
        courtId,
        startTime: { gte: start, lte: end },
        isActive: true,
        isBooked: false,
        OR: [
          { status: 'AVAILABLE' },
          { AND: [{ status: 'RESERVED' }, { reservedUntil: { lt: now } }] },
        ],
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
