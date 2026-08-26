import { Test, TestingModule } from '@nestjs/testing';
import { NotificationBillingService } from './notification-billing.service';
import { PrismaService } from '../prisma/prisma.service';

// P1-01/REQ144 — per-tenant WhatsApp conversation spend, read back from
// NotificationSendLog's own billable/template_category/cost_micro_rupees
// columns that notification-trigger.service.ts writes.
describe('NotificationBillingService', () => {
  let service: NotificationBillingService;
  let prisma: { notificationSendLog: { groupBy: jest.Mock } };

  beforeEach(async () => {
    prisma = { notificationSendLog: { groupBy: jest.fn().mockResolvedValue([]) } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationBillingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationBillingService);
  });

  describe('tenant scoping — Hard Rule 6, never trust a client-supplied org id', () => {
    it('scopes an org-bound caller to their own org and ignores any orgId argument', async () => {
      const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as any;
      await service.getConversationSpend(user, 'org-b');
      expect(prisma.notificationSendLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a', channel: 'whatsapp', billable: true }) }),
      );
    });

    it('lets a platform operator (org-less admin) inspect a specific org via orgId', async () => {
      const user = { sub: 'u1', roles: ['admin'], client_org_id: null } as any;
      await service.getConversationSpend(user, 'org-b');
      expect(prisma.notificationSendLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-b' }) }),
      );
    });

    it('scopes a platform operator to every org when no orgId is supplied', async () => {
      const user = { sub: 'u1', roles: ['super_admin'], client_org_id: null } as any;
      await service.getConversationSpend(user);
      const call = prisma.notificationSendLog.groupBy.mock.calls[0][0];
      expect(call.where.client_org_id).toBeUndefined();
    });
  });

  describe('IST calendar-month period bounds', () => {
    it('computes the current IST month as UTC bounds, not the UTC calendar month', async () => {
      const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as any;
      // 2026-08-31T20:00:00Z is already 2026-09-01T01:30 IST -- the IST
      // month has rolled to September even though the UTC date is still
      // August 31st. If this used the UTC month instead, the returned
      // period would be [2026-08-01, 2026-09-01) rather than
      // [2026-09-01, 2026-10-01) in IST terms.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-31T20:00:00.000Z'));
      const result = await service.getConversationSpend(user);
      jest.useRealTimers();

      // Sept 1st 00:00 IST == Aug 31st 18:30 UTC.
      expect(result.periodStart.toISOString()).toBe('2026-08-31T18:30:00.000Z');
      // Oct 1st 00:00 IST == Sep 30th 18:30 UTC.
      expect(result.periodEnd.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    });
  });

  describe('aggregation shape', () => {
    it('maps grouped rows into byCategory and sums totalCostMicroRupees', async () => {
      const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as any;
      prisma.notificationSendLog.groupBy.mockResolvedValue([
        { template_category: 'utility', _count: { _all: 40 }, _sum: { cost_micro_rupees: 4_600_000 } },
        { template_category: 'marketing', _count: { _all: 2 }, _sum: { cost_micro_rupees: 1_726_200 } },
      ]);

      const result = await service.getConversationSpend(user);

      expect(result.byCategory).toEqual([
        { category: 'utility', count: 40, costMicroRupees: 4_600_000 },
        { category: 'marketing', count: 2, costMicroRupees: 1_726_200 },
      ]);
      expect(result.totalCostMicroRupees).toBe(6_326_200);
    });

    it('excludes any grouped row with a null category (defensive — non-whatsapp rows never reach this query, but never surface a null category if one somehow did)', async () => {
      const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as any;
      prisma.notificationSendLog.groupBy.mockResolvedValue([{ template_category: null, _count: { _all: 5 }, _sum: { cost_micro_rupees: null } }]);

      const result = await service.getConversationSpend(user);

      expect(result.byCategory).toEqual([]);
      expect(result.totalCostMicroRupees).toBe(0);
    });

    it('returns a zeroed summary when nothing billable was sent this period', async () => {
      const user = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as any;
      prisma.notificationSendLog.groupBy.mockResolvedValue([]);
      const result = await service.getConversationSpend(user);
      expect(result.byCategory).toEqual([]);
      expect(result.totalCostMicroRupees).toBe(0);
    });
  });
});
