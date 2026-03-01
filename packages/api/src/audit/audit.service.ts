import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/** Audit action constants - avoid magic strings */
export const AuditAction = {
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
  BOOKING_NO_SHOW: 'BOOKING_NO_SHOW',
  REFUND_APPROVED: 'REFUND_APPROVED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  COMMISSION_CHANGED: 'COMMISSION_CHANGED',
  FACILITY_APPROVED: 'FACILITY_APPROVED',
  ROLE_CHANGED: 'ROLE_CHANGED',
} as const;

export interface AuditParams {
  actorId: string;
  actorRole: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    params: AuditParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        tenantId: params.tenantId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? undefined) as object | undefined,
      },
    });
  }
}
