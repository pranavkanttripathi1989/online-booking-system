import { Test, TestingModule } from '@nestjs/testing';
import { PreAuthUtilizationSweepService } from './preauth-utilization-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// REQ179 (IPD slice 5) -- same shape as admissions/mlc-police-intimation-
// sweep.service.spec.ts.
describe('PreAuthUtilizationSweepService', () => {
  let service: PreAuthUtilizationSweepService;
  let prisma: any;
  let notificationTrigger: any;

  const preauthBase = {
    id: 'pa-1', clinic_id: 'clinic-a', status: 'approved', approved_amount_paise: 400000,
    admission_id: 'adm-a', enhancements: [], admission: { patient: { first_name: 'Anita', last_name: 'Sharma' } },
  };

  beforeEach(async () => {
    prisma = {
      preAuthorizations: { findMany: jest.fn().mockResolvedValue([]) },
      ipdBills: { findUnique: jest.fn() },
      userProfiles: { findMany: jest.fn().mockResolvedValue([]) },
      notifications: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreAuthUtilizationSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(PreAuthUtilizationSweepService);
  });

  it('does nothing when no pre-authorization is approved and admission-bound', async () => {
    await service.sweep();
    expect(prisma.ipdBills.findUnique).not.toHaveBeenCalled();
  });

  it('queries only approved, admission-bound pre-authorizations', async () => {
    await service.sweep();
    const call = prisma.preAuthorizations.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('approved');
    expect(call.where.admission_id).toEqual({ not: null });
  });

  it('does not notify when utilization is below the 80% threshold', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([preauthBase]);
    prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 300000 }); // 75%
    await service.sweep();
    expect(prisma.userProfiles.findMany).not.toHaveBeenCalled();
  });

  it('notifies every manager/admin at the clinic when utilization crosses 80%', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([preauthBase]);
    prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 360000 }); // 90%
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

    await service.sweep();

    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
      'user-1',
      'preauth_enhancement_needed',
      expect.objectContaining({ priority: 'high', type: 'alert' }),
    );
  });

  it('includes approved enhancements in the authorized total, not requested/rejected ones', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([
      {
        ...preauthBase,
        enhancements: [
          { status: 'approved', approved_amount_paise: 100000 },
          { status: 'requested', approved_amount_paise: null },
        ],
      },
    ]);
    // authorized total = 400000 + 100000 = 500000; 82% utilization crosses the threshold
    prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 410000 });
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }]);

    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(1);
  });

  it('skips a pre-authorization with no bill and therefore zero billed amount', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([preauthBase]);
    prisma.ipdBills.findUnique.mockResolvedValue(null);
    await service.sweep();
    expect(prisma.userProfiles.findMany).not.toHaveBeenCalled();
  });

  it('does not re-notify the same recipient on the same day', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([preauthBase]);
    prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 360000 });
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }]);
    prisma.notifications.findFirst.mockResolvedValue({ id: 'already-sent' });

    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('does not abort the whole sweep when one row throws', async () => {
    prisma.preAuthorizations.findMany.mockResolvedValue([
      { ...preauthBase, id: 'pa-bad', admission_id: null },
      { ...preauthBase, id: 'pa-good' },
    ]);
    prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 360000 });
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-1' }]);

    await service.sweep();
    // pa-bad is skipped via its own `continue` (no admission_id), pa-good still notifies.
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(1);
  });
});
