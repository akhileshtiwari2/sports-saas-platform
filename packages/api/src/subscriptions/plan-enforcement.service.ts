import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanLimits {
  maxCourts: number;
  maxCoaches: number;
  maxBookingsPerMonth: number;
  features: Record<string, boolean>;
}

const DEFAULT_PLAN_LIMITS: PlanLimits = {
  maxCourts: 2,
  maxCoaches: 1,
  maxBookingsPerMonth: 50,
  features: { analytics: false, aiPricing: false },
};

@Injectable()
export class PlanEnforcementService {
  private readonly logger = new Logger(PlanEnforcementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Get effective plan limits for tenant. Uses TenantSubscription or default free tier. */
  async getPlanLimits(tenantId: string): Promise<PlanLimits & { planName: string }> {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING')) {
      return {
        ...DEFAULT_PLAN_LIMITS,
        planName: 'FREE',
      };
    }

    const features = (sub.plan.features as Record<string, boolean>) || {};
    return {
      maxCourts: sub.plan.maxCourts,
      maxCoaches: sub.plan.maxCoaches,
      maxBookingsPerMonth: sub.plan.maxBookingsPerMonth,
      features,
      planName: sub.plan.name,
    };
  }

  /** Check and throw if court limit exceeded */
  async assertCourtLimit(tenantId: string): Promise<void> {
    const limits = await this.getPlanLimits(tenantId);
    const count = await this.prisma.court.count({
      where: { facility: { tenantId } },
    });
    if (count >= limits.maxCourts) {
      throw new ForbiddenException(
        `Court limit reached (${limits.maxCourts}). Upgrade your plan to add more courts.`,
      );
    }
  }

  /** Check and throw if coach limit exceeded */
  async assertCoachLimit(tenantId: string): Promise<void> {
    const limits = await this.getPlanLimits(tenantId);
    const count = await this.prisma.coach.count({
      where: { facility: { tenantId } },
    });
    if (count >= limits.maxCoaches) {
      throw new ForbiddenException(
        `Coach limit reached (${limits.maxCoaches}). Upgrade your plan to add more coaches.`,
      );
    }
  }

  /** Check and throw if slot creation would exceed court limit (slots are under courts) */
  async assertSlotLimit(tenantId: string): Promise<void> {
    await this.assertCourtLimit(tenantId);
  }

  /** Check and throw if lesson creation would exceed coach limit */
  async assertLessonLimit(tenantId: string): Promise<void> {
    await this.assertCoachLimit(tenantId);
  }

  /** Check and throw if booking limit for month exceeded */
  async assertBookingLimit(tenantId: string): Promise<void> {
    const limits = await this.getPlanLimits(tenantId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const count = await this.prisma.booking.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
    });

    if (count >= limits.maxBookingsPerMonth) {
      throw new ForbiddenException(
        `Monthly booking limit reached (${limits.maxBookingsPerMonth}). Upgrade your plan for more bookings.`,
      );
    }
  }

  /** Get current usage for display */
  async getUsage(tenantId: string): Promise<{
    courts: number;
    coaches: number;
    bookingsThisMonth: number;
    limits: PlanLimits & { planName: string };
  }> {
    const limits = await this.getPlanLimits(tenantId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [courts, coaches, bookingsThisMonth] = await Promise.all([
      this.prisma.court.count({
        where: { facility: { tenantId } },
      }),
      this.prisma.coach.count({
        where: { facility: { tenantId } },
      }),
      this.prisma.booking.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELLED' },
        },
      }),
    ]);

    return {
      courts,
      coaches,
      bookingsThisMonth,
      limits,
    };
  }
}
