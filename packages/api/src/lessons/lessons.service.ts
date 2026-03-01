import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanEnforcementService } from '../subscriptions/plan-enforcement.service';
import { Decimal } from '@prisma/client/runtime/library';
import { BookingStatus, PaymentStatus } from 'types';
import { StripeService } from '../payments/stripe.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planEnforcement: PlanEnforcementService,
    private readonly stripe: StripeService,
  ) {}

  async getByTenant(tenantId: string, facilityId?: string) {
    const where: Prisma.LessonWhereInput = { coach: { facility: { tenantId } } };
    if (facilityId) where.coach = { facility: { tenantId }, facilityId };
    return this.prisma.lesson.findMany({
      where,
      include: {
        coach: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async create(
    data: {
      coachId: string;
      courtId: string;
      slotId: string;
      title: string;
      description?: string;
      maxStudents?: number;
      price: number;
      startTime: string;
      endTime: string;
    },
    tenantId?: string
  ) {
    const [coach, court, slot] = await Promise.all([
      this.prisma.coach.findUnique({ where: { id: data.coachId }, include: { facility: true } }),
      this.prisma.court.findUnique({ where: { id: data.courtId }, include: { facility: true } }),
      this.prisma.slot.findUnique({ where: { id: data.slotId }, include: { court: { include: { facility: true } } } }),
    ]);
    if (!coach || !court || !slot) throw new BadRequestException('Coach, court or slot not found');
    if (tenantId) {
      if (coach.facility.tenantId !== tenantId || court.facility.tenantId !== tenantId || slot.court.facility.tenantId !== tenantId) {
        throw new ForbiddenException('Resource does not belong to your tenant');
      }
      await this.planEnforcement.assertLessonLimit(tenantId);
    }
    return this.prisma.lesson.create({
      data: {
        coachId: data.coachId,
        courtId: data.courtId,
        slotId: data.slotId,
        title: data.title,
        description: data.description,
        maxStudents: data.maxStudents ?? 1,
        price: new Decimal(data.price),
        status: 'SCHEDULED',
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
      include: { coach: true },
    });
  }

  async update(id: string, data: Partial<{ title: string; description: string; maxStudents: number; price: number }>, tenantId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { coach: { include: { facility: true } } },
    });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (tenantId && lesson.coach.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Lesson does not belong to your tenant');
    }
    const updateData = {
      ...(data.title != null && { title: data.title }),
      ...(data.description != null && { description: data.description }),
      ...(data.maxStudents != null && { maxStudents: data.maxStudents }),
      ...(data.price != null && { price: new Decimal(data.price) }),
    };
    if (!tenantId) {
      return this.prisma.lesson.update({ where: { id }, data: updateData });
    }
    const updated = await this.prisma.lesson.updateMany({
      where: { id, coach: { facility: { tenantId } } },
      data: updateData,
    });
    if (updated.count !== 1) throw new ForbiddenException('Lesson does not belong to your tenant');
    return this.prisma.lesson.findUnique({ where: { id } });
  }

  async enroll(lessonId: string, userId: string, tenantId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { coach: { include: { facility: true } } },
    });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (tenantId && lesson.coach.facility.tenantId !== tenantId) {
      throw new ForbiddenException('Lesson does not belong to your tenant');
    }
    const existingBooking = await this.prisma.booking.findFirst({
      where: { slotId: lesson.slotId, userId },
    });
    if (existingBooking) throw new BadRequestException('User already enrolled');
    const bookingCount = await this.prisma.booking.count({ where: { slotId: lesson.slotId } });
    if (bookingCount >= lesson.maxStudents) throw new BadRequestException('Lesson is full');
    await this.planEnforcement.assertBookingLimit(lesson.coach.facility.tenantId);

    const booking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          tenantId: lesson.coach.facility.tenantId,
          facilityId: lesson.coach.facilityId,
          courtId: lesson.courtId,
          slotId: lesson.slotId,
          userId,
          status: BookingStatus.PENDING,
          totalAmount: lesson.price,
          notes: `LESSON_ENROLLMENT:${lessonId}`,
        },
      });
      await tx.payment.create({
        data: {
          bookingId: b.id,
          amount: lesson.price,
          currency: 'INR',
          status: PaymentStatus.PENDING,
        },
      });
      return b;
    });

    try {
      const pi = await this.stripe.createPaymentIntent(
        Math.round(Number(lesson.price) * 100),
        'inr',
        { bookingId: booking.id, userId },
      );
      return { bookingId: booking.id, clientSecret: pi.client_secret };
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.PENDING },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Payment intent creation failed',
            cancelledAt: new Date(),
          },
        });
        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
      });
      throw error;
    }
  }
}
