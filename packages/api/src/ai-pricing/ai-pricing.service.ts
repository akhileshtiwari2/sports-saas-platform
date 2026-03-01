import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * AI Pricing Suggestion Engine
 * Analyzes historical bookings to suggest:
 * - Peak hour pricing
 * - Off-peak discounts
 * - High demand day predictions
 */
@Injectable()
export class AIPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPricingSuggestions(slotId: string, tenantScope?: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { court: { include: { facility: true } } },
    });
    if (!slot) return null;
    if (tenantScope && slot.court.facility.tenantId !== tenantScope) {
      throw new ForbiddenException('Slot does not belong to your tenant');
    }

    // Analyze historical bookings for this court's time pattern
    const startHour = new Date(slot.startTime).getHours();
    const dayOfWeek = new Date(slot.startTime).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const courtBookings = await this.prisma.booking.findMany({
      where: {
        courtId: slot.courtId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      include: { slot: { select: { startTime: true } } },
    });

    const hourCounts: Record<number, number> = {};
    courtBookings.forEach((b) => {
      const h = new Date(b.slot.startTime).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    const totalBookings = courtBookings.length;
    const avgDemand = totalBookings / 24;
    const demandScore = hourCounts[startHour]
      ? Math.min(1, (hourCounts[startHour] / (avgDemand || 1)) * 0.5)
      : 0.3;
    const isPeakHour = startHour >= 17 || startHour <= 9;
    const peakMultiplier = isPeakHour ? 1.2 : isWeekend ? 1.1 : 1.0;

    const currentPrice = Number(slot.basePrice);
    const suggestedPrice = Math.round(currentPrice * peakMultiplier * (1 + demandScore * 0.2));
    const offPeakDiscount =
      !isPeakHour && !isWeekend
        ? Math.round(currentPrice * 0.85)
        : null;

    return {
      slotId,
      currentPrice,
      suggestedPrice,
      offPeakDiscount,
      reasoning: {
        peakHour: isPeakHour,
        weekend: isWeekend,
        demandScore: Math.round(demandScore * 100) / 100,
        historicalBookings: totalBookings,
      },
    };
  }

  async applySuggestion(slotId: string, apply: boolean, tenantScope?: string) {
    const suggestion = await this.getPricingSuggestions(slotId, tenantScope);
    if (!suggestion || !apply) return suggestion;

    await this.prisma.$transaction(async (tx) => {
      await tx.aIPricingLog.create({
        data: {
          slotId,
          suggestedPrice: new Decimal(suggestion.suggestedPrice),
          originalPrice: new Decimal(suggestion.currentPrice),
          reasoning: JSON.stringify(suggestion.reasoning),
          demandScore: suggestion.reasoning.demandScore,
          peakHour: suggestion.reasoning.peakHour,
          applied: true,
        },
      });

      if (tenantScope) {
        const updated = await tx.slot.updateMany({
          where: { id: slotId, court: { facility: { tenantId: tenantScope } } },
          data: {
            basePrice: new Decimal(suggestion.suggestedPrice),
          },
        });
        if (updated.count !== 1) {
          throw new ForbiddenException('Slot does not belong to your tenant');
        }
      } else {
        await tx.slot.update({
          where: { id: slotId },
          data: {
            basePrice: new Decimal(suggestion.suggestedPrice),
          },
        });
      }
    });

    return { ...suggestion, applied: true };
  }
}
