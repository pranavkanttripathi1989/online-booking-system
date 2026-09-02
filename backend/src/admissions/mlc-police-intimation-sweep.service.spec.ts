import { Test, TestingModule } from '@nestjs/testing';
import { MlcPoliceIntimationSweepService } from './mlc-police-intimation-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

describe('MlcPoliceIntimationSweepService', () => {
  let service: MlcPoliceIntimationSweepService;
  let prisma: any;
  let notificationTrigger: any;

  beforeEach(async () => {
    prisma = {
      mlcRegisters: { findMany: jest.fn().mockResolvedValue([]) },
      userProfiles: { findMany: jest.fn().mockResolvedValue([]) },
      notifications: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlcPoliceIntimationSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(MlcPoliceIntimationSweepService);
  });

  it('does nothing when no MLC register is pending past the warn threshold', async () => {
    await service.sweep();
    expect(prisma.userProfiles.findMany).not.toHaveBeenCalled();
  });

  it('queries only registers with no intimation recorded, at or before the 20h warn cutoff', async () => {
    await service.sweep();
    const call = prisma.mlcRegisters.findMany.mock.calls[0][0];
    expect(call.where.police_intimated_at).toBeNull();
    expect(call.where.recorded_at.lte).toBeInstanceOf(Date);
    // Warns 4h ahead of the real 24h statutory deadline, not at it.
    const hoursOut = (Date.now() - call.where.recorded_at.lte.getTime()) / 3_600_000;
    expect(hoursOut).toBeCloseTo(20, 0);
  });

  it('notifies every manager/admin at the clinic, skipping recipients with no one to notify', async () => {
    prisma.mlcRegisters.findMany.mockResolvedValue([
      { id: 'mlc-1', mlc_number: 'MLC/1', clinic_id: 'clinic-a', recorded_at: new Date(Date.now() - 21 * 3_600_000) },
    ]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

    await service.sweep();

    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
      'user-1',
      'mlc_police_intimation_due',
      expect.objectContaining({ priority: 'high', type: 'alert' }),
    );
  });

  it('does not dispatch at all when the clinic has no manager/admin to notify', async () => {
    prisma.mlcRegisters.findMany.mockResolvedValue([
      { id: 'mlc-1', mlc_number: 'MLC/1', clinic_id: 'clinic-a', recorded_at: new Date(Date.now() - 21 * 3_600_000) },
    ]);
    prisma.userProfiles.findMany.mockResolvedValue([]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('skips a recipient already notified today for this MLC (once-per-day dedup)', async () => {
    prisma.mlcRegisters.findMany.mockResolvedValue([
      { id: 'mlc-1', mlc_number: 'MLC/1', clinic_id: 'clinic-a', recorded_at: new Date(Date.now() - 21 * 3_600_000) },
    ]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }]);
    prisma.notifications.findFirst.mockResolvedValue({ id: 'already-sent' });

    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('continues the sweep when one register throws', async () => {
    prisma.mlcRegisters.findMany.mockResolvedValue([
      { id: 'mlc-bad', mlc_number: 'MLC/BAD', clinic_id: 'clinic-a', recorded_at: new Date(Date.now() - 21 * 3_600_000) },
      { id: 'mlc-good', mlc_number: 'MLC/GOOD', clinic_id: 'clinic-a', recorded_at: new Date(Date.now() - 21 * 3_600_000) },
    ]);
    prisma.userProfiles.findMany.mockImplementation(({ where }: any) => {
      if (where.clinic_id === 'clinic-a') return Promise.resolve([{ id: 'user-1' }]);
      return Promise.resolve([]);
    });
    // Fail on the first register's dispatch, succeed on the second.
    notificationTrigger.dispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);

    await expect(service.sweep()).resolves.not.toThrow();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
  });
});
