import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { RefundStatus } from '@repo/types';
import { REFUND_TRANSITIONS } from '@repo/types';
import { UserRole } from '@repo/types';

/** Refund state machine - APPROVED/REJECTED only from PENDING; PROCESSED only from APPROVED */
function validateRefundTransition(from: string, to: string): void {
  const allowed = REFUND_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid refund transition: ${from} -> ${to}. Allowed: ${allowed?.join(', ') ?? 'none'}`,
    );
  }
}

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getPendingRefunds(tenantId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { status: RefundStatus.PENDING };
    if (tenantId) {
      where.booking = { tenantId };
    }
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: { booking: { include: { user: true, facility: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * SALES_ADMIN: Approve refund request
   */
  async approveRefund(
    refundId: string,
    actorId: string,
    notes?: string,
    actorTenantId?: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: true },
    });
    if (!refund) throw new BadRequestException('Refund not found');
    if (actorTenantId && refund.booking.tenantId !== actorTenantId) {
      throw new ForbiddenException('Refund does not belong to your tenant');
    }
    validateRefundTransition(refund.status, RefundStatus.APPROVED);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (actorTenantId) {
        const updated = await tx.refund.updateMany({
          where: { id: refundId, booking: { tenantId: actorTenantId } },
          data: {
            status: RefundStatus.APPROVED,
            approvedBy: actorId,
            approvedAt: now,
            metadata: notes ? { notes } : undefined,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) {
          throw new ForbiddenException('Refund does not belong to your tenant');
        }
      } else {
        await tx.refund.update({
          where: { id: refundId },
          data: {
            status: RefundStatus.APPROVED,
            approvedBy: actorId,
            approvedAt: now,
            metadata: notes ? { notes } : undefined,
            updatedAt: now,
          },
        });
      }

      await this.audit.log(
        {
          actorId,
          actorRole: UserRole.SALES_ADMIN,
          tenantId: refund.booking.tenantId,
          action: AuditAction.REFUND_APPROVED,
          entityType: 'Refund',
          entityId: refundId,
          metadata: { amount: Number(refund.amount), notes },
        },
        tx,
      );
    });

    return { success: true, status: RefundStatus.APPROVED };
  }

  /**
   * SALES_ADMIN: Reject refund request
   */
  async rejectRefund(
    refundId: string,
    actorId: string,
    reason: string,
    actorTenantId?: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: true },
    });
    if (!refund) throw new BadRequestException('Refund not found');
    if (actorTenantId && refund.booking.tenantId !== actorTenantId) {
      throw new ForbiddenException('Refund does not belong to your tenant');
    }
    validateRefundTransition(refund.status, RefundStatus.REJECTED);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (actorTenantId) {
        const updated = await tx.refund.updateMany({
          where: { id: refundId, booking: { tenantId: actorTenantId } },
          data: {
            status: RefundStatus.REJECTED,
            rejectedBy: actorId,
            rejectedAt: now,
            rejectionReason: reason,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) {
          throw new ForbiddenException('Refund does not belong to your tenant');
        }
      } else {
        await tx.refund.update({
          where: { id: refundId },
          data: {
            status: RefundStatus.REJECTED,
            rejectedBy: actorId,
            rejectedAt: now,
            rejectionReason: reason,
            updatedAt: now,
          },
        });
      }

      await this.audit.log(
        {
          actorId,
          actorRole: UserRole.SALES_ADMIN,
          tenantId: refund.booking.tenantId,
          action: AuditAction.REFUND_REJECTED,
          entityType: 'Refund',
          entityId: refundId,
          metadata: { reason },
        },
        tx,
      );
    });

    return { success: true, status: RefundStatus.REJECTED };
  }

  /**
   * SUPER_ADMIN: Mark refund as processed (after Stripe payout)
   */
  async processRefund(
    refundId: string,
    actorId: string,
    stripeRefundId?: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: true },
    });
    if (!refund) throw new BadRequestException('Refund not found');
    validateRefundTransition(refund.status, RefundStatus.PROCESSED);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.PROCESSED,
          processedBy: actorId,
          processedAt: now,
          stripeRefundId: stripeRefundId ?? refund.stripeRefundId,
          updatedAt: now,
        },
      });

      await this.audit.log(
        {
          actorId,
          actorRole: UserRole.SUPER_ADMIN,
          tenantId: refund.booking.tenantId,
          action: AuditAction.REFUND_PROCESSED,
          entityType: 'Refund',
          entityId: refundId,
          metadata: { stripeRefundId: stripeRefundId ?? refund.stripeRefundId },
        },
        tx,
      );
    });

    return { success: true, status: RefundStatus.PROCESSED };
  }
}
