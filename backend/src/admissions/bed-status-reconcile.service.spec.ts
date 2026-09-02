import { Test, TestingModule } from '@nestjs/testing';
import { BedStatusReconcileService } from './bed-status-reconcile.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BedStatusReconcileService', () => {
  let service: BedStatusReconcileService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      beds: { findMany: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BedStatusReconcileService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BedStatusReconcileService);
  });

  it('finds no divergence for a bed whose cache already matches its live occupancy', async () => {
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'occupied', occupancies: [{ admission_id: 'adm-1', occupancy_kind: 'occupied' }] },
      { id: 'b2', bed_number: '2', status: 'available', occupancies: [] },
    ]);
    const divergences = await service.reconcile(false);
    expect(divergences).toHaveLength(0);
    expect(prisma.beds.update).not.toHaveBeenCalled();
  });

  it('reports and corrects a bed cached as available with a live occupancy', async () => {
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'available', occupancies: [{ admission_id: 'adm-1', occupancy_kind: 'occupied' }] },
    ]);
    const divergences = await service.reconcile(true);
    expect(divergences).toEqual([{ bed_id: 'b1', bed_number: '1', cached_status: 'available', derived_status: 'occupied' }]);
    expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'occupied' } });
  });

  it('reports without correcting when apply is false', async () => {
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'available', occupancies: [{ admission_id: 'adm-1', occupancy_kind: 'occupied' }] },
    ]);
    const divergences = await service.reconcile(false);
    expect(divergences).toHaveLength(1);
    expect(prisma.beds.update).not.toHaveBeenCalled();
  });

  it('does not flag "cleaning" as a divergence even with no open occupancy row', async () => {
    // cleaning is set directly by discharge/transfer, with no timeline row of
    // its own until housekeeping explicitly blocks or releases the bed.
    prisma.beds.findMany.mockResolvedValue([{ id: 'b1', bed_number: '1', status: 'cleaning', occupancies: [] }]);
    const divergences = await service.reconcile(true);
    expect(divergences).toHaveLength(0);
    expect(prisma.beds.update).not.toHaveBeenCalled();
  });

  it('derives a non-admission hold (blocked/reserved) status from the occupancy_kind', async () => {
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'available', occupancies: [{ admission_id: null, occupancy_kind: 'blocked' }] },
    ]);
    const divergences = await service.reconcile(true);
    expect(divergences[0].derived_status).toBe('blocked');
  });

  it('continues reconciling when one bed throws', async () => {
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b-bad', bed_number: 'BAD', status: 'available', occupancies: [{ admission_id: 'adm-1', occupancy_kind: 'occupied' }] },
      { id: 'b-good', bed_number: 'GOOD', status: 'available', occupancies: [{ admission_id: 'adm-2', occupancy_kind: 'occupied' }] },
    ]);
    prisma.beds.update.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
    await expect(service.reconcile(true)).resolves.not.toThrow();
    expect(prisma.beds.update).toHaveBeenCalledTimes(2);
  });
});
