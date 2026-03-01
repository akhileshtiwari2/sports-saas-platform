import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Den (Super Admin) analytics */
export interface DenAnalytics {
  gmv: number;
  monthlyRevenue: number;
  activeTenants: number;
  monthlyGrowth: number; // % vs previous month
  revenuePerTenant: number;
}

/** Slot utilization for Den */
export interface SlotUtilizationMetrics {
  totalSlots: number;
  bookedSlots: number;
  utilizationPercent: number;
  peakHours: { hour: number; bookingCount: number }[];
}

/** Lineup (Facility Owner) analytics */
export interface FacilityRevenueAnalytics {
  facilityId: string;
  totalRevenue: number;
  bookingCount: number;
  occupancyByDate: { date: string; booked: number; total: number; percent: number }[];
}

/** Slate (Customer) analytics */
export interface UserBookingAnalytics {
  userId: string;
  totalBookings: number;
  repeatRate: number; // % of users who booked 2+ times
  bookingFrequency: number; // avg bookings per month
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Den: GMV, active tenants, monthly revenue, growth
   */
  async getDenAnalytics(year: number, month: number): Promise<DenAnalytics> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const prevStart = new Date(year, month - 2, 1);
    const prevEnd = new Date(year, month - 1, 0, 23, 59, 59);

    const [currentBookings, prevBookings, tenantCount, facilityCount] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: prevStart, lte: prevEnd } },
        _sum: { totalAmount: true },
      }),
      this.prisma.tenant.count(),
      this.prisma.facility.count({ where: { status: 'ACTIVE' } }),
    ]);

    const monthlyRevenue = Number(currentBookings._sum.totalAmount ?? 0);
    const prevRevenue = Number(prevBookings._sum.totalAmount ?? 0);
    const monthlyGrowth = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const activeTenants = await this.prisma.booking.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: start, lte: end }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    });

    return {
      gmv: monthlyRevenue,
      monthlyRevenue,
      activeTenants: activeTenants.length,
      monthlyGrowth,
      revenuePerTenant: activeTenants.length > 0 ? monthlyRevenue / activeTenants.length : 0,
    };
  }

  /**
   * Den: Slot utilization and peak hours
   */
  async getSlotUtilization(startDate: Date, endDate: Date): Promise<SlotUtilizationMetrics> {
    const slots = await this.prisma.slot.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        isActive: true,
      },
      select: { id: true, isBooked: true, startTime: true },
    });

    const totalSlots = slots.length;
    const bookedSlots = slots.filter((s) => s.isBooked).length;
    const utilizationPercent = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    // Peak hour: group by hour of day
    const hourCounts = new Map<number, number>();
    for (const s of slots.filter((s) => s.isBooked)) {
      const hour = new Date(s.startTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
    const peakHours = Array.from(hourCounts.entries())
      .map(([hour, bookingCount]) => ({ hour, bookingCount }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10);

    return { totalSlots, bookedSlots, utilizationPercent, peakHours };
  }

  /**
   * Lineup: Facility revenue and occupancy heatmap data.
   * When tenantId provided (FACILITY_ADMIN), verifies facility belongs to tenant.
   */
  async getFacilityRevenue(
    facilityId: string,
    startDate: Date,
    endDate: Date,
    tenantId?: string,
  ): Promise<FacilityRevenueAnalytics> {
    if (tenantId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: facilityId },
        select: { tenantId: true },
      });
      if (!facility || facility.tenantId !== tenantId) {
        throw new ForbiddenException('Facility not found or access denied');
      }
    }
    const [bookings, courts, slotsInRange] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          facilityId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { slot: true },
      }),
      this.prisma.court.findMany({ where: { facilityId } }),
      this.prisma.slot.findMany({
        where: {
          court: { facilityId },
          startTime: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    // Occupancy by date
    const dateMap = new Map<string, { booked: number; total: number }>();
    for (const s of slotsInRange) {
      const d = new Date(s.startTime).toISOString().slice(0, 10);
      const cur = dateMap.get(d) ?? { booked: 0, total: 0 };
      cur.total++;
      if (s.isBooked) cur.booked++;
      dateMap.set(d, cur);
    }
    const occupancyByDate = Array.from(dateMap.entries())
      .map(([date, { booked, total }]) => ({
        date,
        booked,
        total,
        percent: total > 0 ? (booked / total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      facilityId,
      totalRevenue,
      bookingCount: bookings.length,
      occupancyByDate,
    };
  }

  /**
   * Slate: User booking frequency and repeat rate
   */
  async getUserBookingAnalytics(userId: string): Promise<UserBookingAnalytics> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      select: { id: true, createdAt: true },
    });

    const totalBookings = bookings.length;
    const months = new Set(bookings.map((b) => `${b.createdAt.getFullYear()}-${b.createdAt.getMonth()}`)).size;
    const bookingFrequency = months > 0 ? totalBookings / months : 0;

    // Repeat rate: users with 2+ bookings
    const allUsersWithBookings = await this.prisma.booking.groupBy({
      by: ['userId'],
      _count: { id: true },
    });
    const repeatUsers = allUsersWithBookings.filter((u) => u._count.id >= 2).length;
    const repeatRate = allUsersWithBookings.length > 0
      ? (repeatUsers / allUsersWithBookings.length) * 100
      : 0;

    return {
      userId,
      totalBookings,
      repeatRate,
      bookingFrequency,
    };
  }
}
