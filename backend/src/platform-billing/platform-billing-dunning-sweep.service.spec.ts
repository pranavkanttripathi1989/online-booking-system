import { Test, TestingModule } from '@nestjs/testing';
import { PlatformBillingDunningSweepService } from './platform-billing-dunning-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlatformBillingService } from './platform-billing.service';

describe('PlatformBillingDunningSweepService', () => {
  let service: PlatformBillingDunningSweepService;
  let prisma: {
    platformSubscriptions: { findMany: jest.Mock; update: jest.Mock };
    platformInvoices: { findFirst: jest.Mock };
    platformDunningEvents: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let organizationsService: { assignPlan: jest.Mock };
  let platformBillingService: { generateNextInvoice: jest.Mock; notifyOrg: jest.Mock };

  beforeEach(async () => {
    prisma = {
      platformSubscriptions: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      platformInvoices: { findFirst: jest.fn().mockResolvedValue(null) },
      platformDunningEvents: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    organizationsService = { assignPlan: jest.fn() };
    platformBillingService = { generateNextInvoice: jest.fn(), notifyOrg: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformBillingDunningSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: PlatformBillingService, useValue: platformBillingService },
      ],
    }).compile();

    service = module.get(PlatformBillingDunningSweepService);
  });

  describe('generateUpcomingInvoices', () => {
    it('generates the next invoice for an active subscription due within the lead window', async () => {
      const subscription = { id: 'sub-1', status: 'active', cancel_at_period_end: false, current_period_end: new Date() };
      prisma.platformSubscriptions.findMany.mockResolvedValueOnce([subscription]);
      await service.sweep();
      expect(platformBillingService.generateNextInvoice).toHaveBeenCalledWith('sub-1');
    });

    it('skips a subscription that already has an invoice generated for this cycle', async () => {
      const subscription = { id: 'sub-1', status: 'active', cancel_at_period_end: false, current_period_end: new Date() };
      prisma.platformSubscriptions.findMany.mockResolvedValueOnce([subscription]);
      prisma.platformInvoices.findFirst.mockResolvedValueOnce({ id: 'inv-existing' });
      await service.sweep();
      expect(platformBillingService.generateNextInvoice).not.toHaveBeenCalled();
    });

    it('queries only active/trialing subscriptions not already flagged cancel_at_period_end', async () => {
      await service.sweep();
      const call = prisma.platformSubscriptions.findMany.mock.calls[0][0];
      expect(call.where.status.in).toEqual(['active', 'trialing']);
      expect(call.where.cancel_at_period_end).toBe(false);
    });

    it('continues the loop when one subscription throws', async () => {
      const bad = { id: 'sub-bad', status: 'active', cancel_at_period_end: false, current_period_end: new Date() };
      const good = { id: 'sub-good', status: 'active', cancel_at_period_end: false, current_period_end: new Date() };
      prisma.platformSubscriptions.findMany.mockResolvedValueOnce([bad, good]);
      platformBillingService.generateNextInvoice.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
      await expect(service.sweep()).resolves.not.toThrow();
      expect(platformBillingService.generateNextInvoice).toHaveBeenCalledWith('sub-good');
    });
  });

  describe('escalatePastDue', () => {
    function daysAgo(n: number) {
      return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    }

    it('does nothing for a past_due subscription with no recorded failure event', async () => {
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.status === 'past_due' ? [{ id: 'sub-1', client_org_id: 'org-1' }] : []));
      prisma.platformDunningEvents.findFirst.mockResolvedValueOnce(null);
      await service.sweep();
      expect(prisma.platformSubscriptions.update).not.toHaveBeenCalled();
      expect(organizationsService.assignPlan).not.toHaveBeenCalled();
    });

    it.each([1, 3, 7])('logs a retry_scheduled dunning event on day %i since the failure, without suspending', async (day) => {
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.status === 'past_due' ? [{ id: 'sub-1', client_org_id: 'org-1' }] : []));
      prisma.platformDunningEvents.findFirst
        .mockResolvedValueOnce({ occurred_at: daysAgo(day) }) // lastFailure lookup
        .mockResolvedValueOnce(null); // alreadyLoggedToday lookup
      await service.sweep();
      expect(prisma.platformDunningEvents.create).toHaveBeenCalledWith({
        data: { subscription_id: 'sub-1', event_type: 'retry_scheduled', attempt_number: day },
      });
      expect(prisma.platformSubscriptions.update).not.toHaveBeenCalled();
    });

    it('does not log a duplicate retry_scheduled event for the same day if already logged', async () => {
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.status === 'past_due' ? [{ id: 'sub-1', client_org_id: 'org-1' }] : []));
      prisma.platformDunningEvents.findFirst
        .mockResolvedValueOnce({ occurred_at: daysAgo(3) })
        .mockResolvedValueOnce({ id: 'already-logged' });
      await service.sweep();
      expect(prisma.platformDunningEvents.create).not.toHaveBeenCalled();
    });

    it('suspends the subscription and revokes entitlements once SUSPEND_AFTER_DAYS (10) has passed', async () => {
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.status === 'past_due' ? [{ id: 'sub-1', client_org_id: 'org-1' }] : []));
      prisma.platformDunningEvents.findFirst.mockResolvedValueOnce({ occurred_at: daysAgo(10) });
      await service.sweep();
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'suspended' } });
      expect(prisma.platformDunningEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscription_id: 'sub-1', event_type: 'suspended' }) }),
      );
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
      expect(platformBillingService.notifyOrg).toHaveBeenCalledWith(
        'org-1',
        'platform_subscription_suspended',
        expect.objectContaining({ priority: 'high', type: 'payment' }),
      );
    });

    it('continues the loop when one subscription throws during escalation', async () => {
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) =>
        args.where.status === 'past_due' ? [{ id: 'sub-bad', client_org_id: 'org-bad' }, { id: 'sub-good', client_org_id: 'org-good' }] : [],
      );
      prisma.platformDunningEvents.findFirst
        .mockRejectedValueOnce(new Error('db down')) // sub-bad's lookup throws
        .mockResolvedValueOnce(null); // sub-good has no failure event -> no-op
      await expect(service.sweep()).resolves.not.toThrow();
    });
  });

  describe('finalizeExpiredGracefulCancellations', () => {
    it('finalizes a subscription whose period has ended with cancel_at_period_end set and no gateway confirmation received', async () => {
      const subscription = { id: 'sub-1', client_org_id: 'org-1', cancel_at_period_end: true, status: 'active', current_period_end: new Date() };
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.cancel_at_period_end === true ? [subscription] : []));
      await service.sweep();
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'cancelled', cancelled_at: expect.any(Date) },
      });
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
    });

    it('continues the loop when one finalization throws', async () => {
      const bad = { id: 'sub-bad', client_org_id: 'org-bad', cancel_at_period_end: true, status: 'active', current_period_end: new Date() };
      const good = { id: 'sub-good', client_org_id: 'org-good', cancel_at_period_end: true, status: 'active', current_period_end: new Date() };
      prisma.platformSubscriptions.findMany.mockImplementation(async (args: any) => (args.where.cancel_at_period_end === true ? [bad, good] : []));
      prisma.platformSubscriptions.update.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
      await expect(service.sweep()).resolves.not.toThrow();
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-good', null);
    });

    it('queries only subscriptions with a current_period_end already in the past', async () => {
      await service.sweep();
      const call = prisma.platformSubscriptions.findMany.mock.calls.find((c: any) => c[0].where.cancel_at_period_end === true);
      expect(call[0].where.status.in).toEqual(['active', 'trialing', 'past_due', 'grace']);
      expect(call[0].where.current_period_end.lte).toBeInstanceOf(Date);
    });
  });
});
