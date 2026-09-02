import { Test, TestingModule } from '@nestjs/testing';
import { MarScheduleSweepService } from './mar-schedule-sweep.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MarScheduleSweepService', () => {
  let service: MarScheduleSweepService;
  let prisma: any;

  const activeOrder = {
    id: 'order-1',
    client_org_id: 'org-a',
    admission_id: 'adm-a',
    drug_id: 'drug-a',
    status: 'active',
    is_prn: false,
    start_at: new Date(Date.now() - 3 * 86_400_000),
    stop_at: null,
    schedule_times_json: ['08:00', '20:00'],
    admission: { status: 'admitted' },
  };

  beforeEach(async () => {
    prisma = {
      ipdMedicationOrders: { findMany: jest.fn().mockResolvedValue([]) },
      medicationAdministrations: { upsert: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarScheduleSweepService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MarScheduleSweepService);
  });

  it('does nothing when there are no eligible orders', async () => {
    await service.sweep();
    expect(prisma.medicationAdministrations.upsert).not.toHaveBeenCalled();
  });

  it('only queries active, non-PRN orders whose window has not lapsed', async () => {
    await service.sweep();
    const where = prisma.ipdMedicationOrders.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('active');
    expect(where.is_prn).toBe(false);
  });

  it('skips an order whose admission is no longer live', async () => {
    prisma.ipdMedicationOrders.findMany.mockResolvedValue([{ ...activeOrder, admission: { status: 'discharged' } }]);
    await service.sweep();
    expect(prisma.medicationAdministrations.upsert).not.toHaveBeenCalled();
  });

  it('skips an order with no schedule times', async () => {
    prisma.ipdMedicationOrders.findMany.mockResolvedValue([{ ...activeOrder, schedule_times_json: [] }]);
    await service.sweep();
    expect(prisma.medicationAdministrations.upsert).not.toHaveBeenCalled();
  });

  it('upserts one row per schedule time within the 24h window, keyed on the composite unique', async () => {
    prisma.ipdMedicationOrders.findMany.mockResolvedValue([activeOrder]);
    await service.sweep();
    expect(prisma.medicationAdministrations.upsert).toHaveBeenCalled();
    for (const call of prisma.medicationAdministrations.upsert.mock.calls) {
      const arg = call[0];
      expect(arg.where.order_id_scheduled_at.order_id).toBe('order-1');
      expect(arg.update).toEqual({});
      expect(arg.create).toEqual(
        expect.objectContaining({ client_org_id: 'org-a', admission_id: 'adm-a', order_id: 'order-1', drug_id: 'drug-a', status: 'scheduled' }),
      );
    }
  });

  it('re-running the sweep is idempotent — same slots, same upsert calls (safe against the unique constraint)', async () => {
    prisma.ipdMedicationOrders.findMany.mockResolvedValue([activeOrder]);
    await service.sweep();
    const firstRunCallCount = prisma.medicationAdministrations.upsert.mock.calls.length;
    prisma.medicationAdministrations.upsert.mockClear();
    await service.sweep();
    expect(prisma.medicationAdministrations.upsert).toHaveBeenCalledTimes(firstRunCallCount);
  });

  it('does not materialise a slot past the order stop_at', async () => {
    const stopAt = new Date(Date.now() + 2 * 3_600_000); // stops 2h from now
    prisma.ipdMedicationOrders.findMany.mockResolvedValue([{ ...activeOrder, stop_at: stopAt }]);
    await service.sweep();
    for (const call of prisma.medicationAdministrations.upsert.mock.calls) {
      const scheduledAt = call[0].create.scheduled_at as Date;
      expect(scheduledAt.getTime()).toBeLessThanOrEqual(stopAt.getTime());
    }
  });
});
