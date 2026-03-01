import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';

export interface BookingRevenueBreakdown {
  bookingId: string;
  totalAmount: number;
  facilityRevenue: number;
  commissionAmount: number;
  commissionPercent: number;
  netPayout: number;
}

export interface MonthlyRevenueSummary {
  tenantId: string;
  month: string;
  totalBookings: number;
  grossRevenue: number;
  commissionAmount: number;
  netPayout: number;
}

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get effective commission % for a tenant/facility.
   * Facility-specific overrides tenant default.
   */
  async getCommissionRate(tenantId: string, facilityId?: string): Promise<number> {
    if (facilityId) {
      const facilityCommission = await this.prisma.commission.findFirst({
        where: { tenantId, facilityId, isActive: true },
      });
      if (facilityCommission) return Number(facilityCommission.percentage);
    }
    const defaultCommission = await this.prisma.commission.findFirst({
      where: { tenantId, facilityId: null, isActive: true },
    });
    return defaultCommission ? Number(defaultCommission.percentage) : 0;
  }

  /**
   * Calculate revenue breakdown for a single booking.
   */
  async getPayoutForBooking(bookingId: string, tenantScope?: string): Promise<BookingRevenueBreakdown> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (tenantScope && booking.tenantId !== tenantScope) {
      throw new ForbiddenException('Booking does not belong to your tenant');
    }
    if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
      throw new BadRequestException('Booking must be confirmed or completed');
    }
    if (
      booking.commissionRateSnapshot == null ||
      booking.commissionAmountSnapshot == null ||
      booking.netPayoutSnapshot == null
    ) {
      throw new BadRequestException('Confirmed booking missing immutable commission snapshot');
    }

    const totalAmount = Number(booking.totalAmount);
    const commissionPercent = Number(booking.commissionRateSnapshot);
    const commissionAmount = Number(booking.commissionAmountSnapshot);
    const netPayout = Number(booking.netPayoutSnapshot);

    return {
      bookingId,
      totalAmount,
      facilityRevenue: totalAmount,
      commissionAmount,
      commissionPercent,
      netPayout,
    };
  }

  /**
   * Monthly revenue summary per tenant. For Den analytics.
   */
  async getMonthlyRevenueByTenant(
    year: number,
    month: number,
  ): Promise<MonthlyRevenueSummary[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        tenantId: true,
        totalAmount: true,
        facilityId: true,
        commissionRateSnapshot: true,
        commissionAmountSnapshot: true,
        netPayoutSnapshot: true,
      },
    });

    const byTenant = new Map<string, { total: number; commission: number }>();
    for (const b of bookings) {
      const amount = Number(b.totalAmount);
      if (
        b.commissionRateSnapshot == null ||
        b.commissionAmountSnapshot == null ||
        b.netPayoutSnapshot == null
      ) {
        throw new BadRequestException(
          `Confirmed booking ${b.id} is missing immutable commission snapshot fields`,
        );
      }
      const commission = Number(b.commissionAmountSnapshot);
      const existing = byTenant.get(b.tenantId) ?? { total: 0, commission: 0 };
      byTenant.set(b.tenantId, {
        total: existing.total + amount,
        commission: existing.commission + commission,
      });
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return Array.from(byTenant.entries()).map(([tenantId, { total, commission }]) => ({
      tenantId,
      month: monthStr,
      totalBookings: bookings.filter((b) => b.tenantId === tenantId).length,
      grossRevenue: total,
      commissionAmount: commission,
      netPayout: total - commission,
    }));
  }

  async listCommissions(tenantId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.commission.findMany({
      where,
      orderBy: [{ tenantId: 'asc' }, { facilityId: 'asc' }],
    });
  }
}
