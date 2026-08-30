import { Test, TestingModule } from '@nestjs/testing';
import { ChronicRegistryRecallSweepService } from './chronic-registry-recall-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// REQ168 (P2-12).
describe('ChronicRegistryRecallSweepService', () => {
  let service: ChronicRegistryRecallSweepService;
  let prisma: {
    chronicRegistryEnrollments: { findMany: jest.Mock };
    userProfiles: { findMany: jest.Mock };
    notifications: { findFirst: jest.Mock };
  };
  let notificationTrigger: { dispatch: jest.Mock };

  const OVERDUE_REVIEW = new Date('2026-01-01T00:00:00.000Z'); // well past the 90-day interval
  const UPCOMING_REVIEW = new Date(); // reviewed just now -- not overdue

  beforeEach(async () => {
    prisma = {
      chronicRegistryEnrollments: { findMany: jest.fn().mockResolvedValue([]) },
      userProfiles: { findMany: jest.fn().mockResolvedValue([]) },
      notifications: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChronicRegistryRecallSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(ChronicRegistryRecallSweepService);
  });

  it('does nothing when nothing is overdue', async () => {
    prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([
      { last_reviewed_at: UPCOMING_REVIEW, patient: { client_org_id: 'org-a', first_name: 'A', last_name: 'B' } },
    ]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('notifies every admin/manager in the overdue patient\'s org', async () => {
    prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([
      { last_reviewed_at: OVERDUE_REVIEW, patient: { client_org_id: 'org-a', first_name: 'Anita', last_name: 'Sharma' } },
    ]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'mgr-1' }]);
    await service.sweep();
    expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a', role: { name: { in: ['admin', 'manager'] } } }) }),
    );
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('admin-1', 'chronic_registry_recall_due', expect.objectContaining({ title: 'Chronic-disease recall due' }));
  });

  it('skips a recipient already alerted within the last 7 days', async () => {
    prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([
      { last_reviewed_at: OVERDUE_REVIEW, patient: { client_org_id: 'org-a', first_name: 'Anita', last_name: 'Sharma' } },
    ]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    prisma.notifications.findFirst.mockResolvedValue({ id: 'notif-1' });
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('skips a patient with no org to notify staff in', async () => {
    prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([
      { last_reviewed_at: OVERDUE_REVIEW, patient: { client_org_id: null, first_name: 'Anita', last_name: 'Sharma' } },
    ]);
    await service.sweep();
    expect(prisma.userProfiles.findMany).not.toHaveBeenCalled();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('continues to the next org if one org\'s dispatch fails', async () => {
    prisma.chronicRegistryEnrollments.findMany.mockResolvedValue([
      { last_reviewed_at: OVERDUE_REVIEW, patient: { client_org_id: 'org-a', first_name: 'Anita', last_name: 'Sharma' } },
      { last_reviewed_at: OVERDUE_REVIEW, patient: { client_org_id: 'org-b', first_name: 'Ravi', last_name: 'Kumar' } },
    ]);
    prisma.userProfiles.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(where.client_org_id === 'org-a' ? [{ id: 'admin-a' }] : [{ id: 'admin-b' }]),
    );
    notificationTrigger.dispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    await expect(service.sweep()).resolves.not.toThrow();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
  });
});
