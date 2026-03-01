import { FacilityService } from './facility.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanEnforcementService } from '../subscriptions/plan-enforcement.service';

describe('FacilityService public slots response', () => {
  it('returns only slotId/startTime/endTime/availability without PII', async () => {
    const prisma = {
      slot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'slot-1',
            startTime: new Date('2026-03-01T10:00:00.000Z'),
            endTime: new Date('2026-03-01T11:00:00.000Z'),
            isBooked: true,
            status: 'BOOKED',
          },
        ]),
      },
    };

    const service = new FacilityService(
      prisma as unknown as PrismaService,
      {} as PlanEnforcementService,
    );
    const result = await service.getSlotsByFacility(
      'facility-1',
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-02T00:00:00.000Z'),
    );

    expect(prisma.slot.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      slotId: 'slot-1',
      startTime: new Date('2026-03-01T10:00:00.000Z'),
      endTime: new Date('2026-03-01T11:00:00.000Z'),
      availability: 'BOOKED',
    });
    expect(result[0]).not.toHaveProperty('bookings');
    expect(result[0]).not.toHaveProperty('user');
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0]).not.toHaveProperty('phone');
    expect(result[0]).not.toHaveProperty('name');
    expect(result[0]).not.toHaveProperty('userId');
  });
});
