import { Test, TestingModule } from '@nestjs/testing';
import { LowStockSweepService } from './low-stock-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

// REQ022 (US-PHR-09, scoped).
describe('LowStockSweepService', () => {
  let service: LowStockSweepService;
  let prisma: {
    drugs: { findMany: jest.Mock };
    drugBatches: { groupBy: jest.Mock };
    userProfiles: { findMany: jest.Mock };
    notifications: { findFirst: jest.Mock };
  };
  let notificationTrigger: { dispatch: jest.Mock };

  beforeEach(async () => {
    prisma = {
      drugs: { findMany: jest.fn().mockResolvedValue([]) },
      drugBatches: { groupBy: jest.fn().mockResolvedValue([]) },
      userProfiles: { findMany: jest.fn().mockResolvedValue([]) },
      notifications: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LowStockSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(LowStockSweepService);
  });

  it('does nothing when no drug has a reorder_level configured', async () => {
    await service.sweep();
    expect(prisma.drugBatches.groupBy).not.toHaveBeenCalled();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('does not notify for a drug whose stock is still above its reorder level', async () => {
    prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10, client_org_id: 'org-a' }]);
    prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 50 } }]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('notifies every admin/manager in the drug\'s org when stock is at or below the reorder level', async () => {
    prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10, client_org_id: 'org-a' }]);
    prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 5 } }]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'mgr-1' }]);
    await service.sweep();
    expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a', role: { name: { in: ['admin', 'manager'] } } }) }),
    );
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('admin-1', 'low_stock_alert', expect.objectContaining({ title: 'Low stock: Amoxicillin' }));
  });

  it('skips a recipient who was already alerted for this exact drug today', async () => {
    prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10, client_org_id: 'org-a' }]);
    prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 5 } }]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    prisma.notifications.findFirst.mockResolvedValue({ id: 'notif-1' }); // already alerted today
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('treats a drug with zero matching batches as zero stock on hand (still notifies)', async () => {
    prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10, client_org_id: 'org-a' }]);
    prisma.drugBatches.groupBy.mockResolvedValue([]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalled();
  });

  it('continues to the next recipient if one dispatch fails', async () => {
    prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10, client_org_id: 'org-a' }]);
    prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 5 } }]);
    prisma.userProfiles.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'mgr-1' }]);
    notificationTrigger.dispatch.mockRejectedValueOnce(new Error('dispatch failed')).mockResolvedValueOnce(undefined);
    await expect(service.sweep()).resolves.not.toThrow();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
  });
});
