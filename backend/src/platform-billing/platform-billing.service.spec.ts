import { Test, TestingModule } from '@nestjs/testing';
import { PlatformBillingService } from './platform-billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ORIGINAL_ENV = process.env;

describe('PlatformBillingService (REQ178/179/180)', () => {
  let service: PlatformBillingService;
  let prisma: {
    clientOrganizations: { findUnique: jest.Mock };
    platformSubscriptions: { findFirst: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    plans: { findUnique: jest.Mock };
    planVersions: { findUnique: jest.Mock };
    users: { findUnique: jest.Mock };
    userProfiles: { findMany: jest.Mock };
    platformInvoices: { findFirst: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    platformInvoiceSequences: { upsert: jest.Mock };
    platformDunningEvents: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let organizationsService: { assignPlan: jest.Mock };
  let notificationTrigger: { dispatch: jest.Mock };
  let fetchMock: jest.Mock;

  const superAdmin: JwtPayload = { sub: 'admin-1', roles: ['super_admin'], client_org_id: null } as JwtPayload;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_SUBSCRIPTIONS_KEY_ID: 'rzp_test', RAZORPAY_SUBSCRIPTIONS_KEY_SECRET: 'secret', RAZORPAY_SUBSCRIPTIONS_WEBHOOK_SECRET: 'whsec' };
    prisma = {
      // Default: no linked owner, no admins/managers found -- notifyOrg()
      // simply sends to nobody rather than crashing. Tests that care about
      // notifyOrg's own recipient-resolution logic override these
      // explicitly (see the dedicated 'notifyOrg' describe block).
      clientOrganizations: { findUnique: jest.fn().mockResolvedValue({ owner_user_id: null }) },
      platformSubscriptions: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      plans: { findUnique: jest.fn() },
      planVersions: { findUnique: jest.fn() },
      users: { findUnique: jest.fn() },
      userProfiles: { findMany: jest.fn().mockResolvedValue([]) },
      platformInvoices: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      platformInvoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
      platformDunningEvents: { create: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    organizationsService = { assignPlan: jest.fn() };
    notificationTrigger = { dispatch: jest.fn() };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformBillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(PlatformBillingService);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('providers', () => {
    it('lists both registered gateways', () => {
      const providers = service.providers();
      expect(providers.map((p) => p.id).sort()).toEqual(['razorpay', 'stripe']);
    });
  });

  describe('createSubscription', () => {
    const org = { id: 'org-1', name: 'Test Clinic', is_deleted: false, owner_user_id: null, contact_email: 'org@example.com', contact_phone: '9999999999' };
    const planVersion = { id: 'pv-1', billing_period: 'monthly', price_paise: 500000 }; // ₹5000
    const plan = { id: 'plan-1', is_active: true, versions: [planVersion] };

    it('rejects a nonexistent organization', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(null);
      const result = await service.createSubscription({ client_org_id: 'org-x', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);
      expect(result.success).toBe(false);
    });

    it('rejects an org that already has an active subscription', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue({ id: 'existing-sub' });
      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/already has an active subscription/);
    });

    it('rejects a nonexistent or inactive plan', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      prisma.plans.findUnique.mockResolvedValue({ ...plan, is_active: false });
      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);
      expect(result.success).toBe(false);
    });

    it('rejects a plan with no currently-effective version', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      prisma.plans.findUnique.mockResolvedValue({ ...plan, versions: [] });
      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/no active version/);
    });

    it('rejects an unknown gateway', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      prisma.plans.findUnique.mockResolvedValue(plan);
      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'paypal' } as any, superAdmin);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Unknown gateway/);
    });

    it('creates a real subscription via the gateway and stores it as trialing, mandate pending', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      prisma.plans.findUnique.mockResolvedValue(plan);
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'rzp_plan_1' }) }) // create razorpay plan
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub_1', short_url: 'https://rzp.io/i/abc' }) }); // create subscription
      prisma.platformSubscriptions.create.mockResolvedValue({
        id: 'plat-sub-1',
        client_org: org,
        plan,
        plan_version: planVersion,
        status: 'trialing',
        gateway: 'razorpay',
        mandate_status: 'pending',
        current_period_start: new Date(),
        current_period_end: new Date(),
        cancel_at_period_end: false,
        created_at: new Date(),
      });

      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);

      expect(result.success).toBe(true);
      expect(result.subscription!.status).toBe('trialing');
      expect(result.subscription!.authentication_url).toBe('https://rzp.io/i/abc');
      expect(prisma.platformSubscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            client_org_id: 'org-1',
            plan_id: 'plan-1',
            plan_version_id: 'pv-1',
            status: 'trialing',
            gateway: 'razorpay',
            gateway_subscription_id: 'sub_1',
            mandate_status: 'pending',
            created_by_user_id: 'admin-1',
          }),
        }),
      );
    });

    it('returns a clean failure, no DB write, when the gateway itself rejects the request', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(org);
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      prisma.plans.findUnique.mockResolvedValue(plan);
      fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { description: 'Invalid key' } }) });

      const result = await service.createSubscription({ client_org_id: 'org-1', plan_id: 'plan-1', gateway: 'razorpay' } as any, superAdmin);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Invalid key/);
      expect(prisma.platformSubscriptions.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    const subscription = { id: 'sub-1', client_org_id: 'org-1', status: 'active', gateway: 'razorpay', gateway_subscription_id: 'rzp_sub_1' };

    it('rejects a nonexistent subscription', async () => {
      prisma.platformSubscriptions.findUnique.mockResolvedValue(null);
      const result = await service.cancelSubscription({ subscription_id: 'nope', reason: 'x' } as any, superAdmin);
      expect(result.success).toBe(false);
    });

    it('rejects an already-cancelled subscription', async () => {
      prisma.platformSubscriptions.findUnique.mockResolvedValue({ ...subscription, status: 'cancelled' });
      const result = await service.cancelSubscription({ subscription_id: 'sub-1', reason: 'x' } as any, superAdmin);
      expect(result.success).toBe(false);
    });

    it('defaults to a graceful cancel-at-period-end, leaving entitlements untouched', async () => {
      prisma.platformSubscriptions.findUnique.mockResolvedValue(subscription);
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'rzp_sub_1' }) });

      const result = await service.cancelSubscription({ subscription_id: 'sub-1', reason: 'switching providers' } as any, superAdmin);

      expect(result.success).toBe(true);
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cancel_at_period_end: true, cancellation_reason: 'switching providers' }) }),
      );
      expect(organizationsService.assignPlan).not.toHaveBeenCalled();
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body).cancel_at_cycle_end).toBe(1);
    });

    it('cancels immediately when requested, revoking entitlements right away', async () => {
      prisma.platformSubscriptions.findUnique.mockResolvedValue(subscription);
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'rzp_sub_1' }) });

      const result = await service.cancelSubscription({ subscription_id: 'sub-1', reason: 'fraud', immediately: true } as any, superAdmin);

      expect(result.success).toBe(true);
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled', cancellation_reason: 'fraud' }) }),
      );
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
    });

    it('returns a clean failure and touches nothing when the gateway cancel call fails', async () => {
      prisma.platformSubscriptions.findUnique.mockResolvedValue(subscription);
      fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { description: 'Subscription not found at Razorpay' } }) });

      const result = await service.cancelSubscription({ subscription_id: 'sub-1', reason: 'x' } as any, superAdmin);
      expect(result.success).toBe(false);
      expect(prisma.platformSubscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('applyBillingEvent', () => {
    const subscription = {
      id: 'sub-1',
      client_org_id: 'org-1',
      plan_id: 'plan-1',
      plan_version_id: 'pv-1',
      gateway: 'razorpay',
      status: 'active',
      cancel_at_period_end: false,
      mandate_status: 'confirmed',
      current_period_end: new Date('2026-10-01T00:00:00Z'),
      refunded_at: null,
      client_org: { id: 'org-1' },
    };

    it('no-ops on an ignored event type', async () => {
      const result = await service.applyBillingEvent('razorpay', { type: 'ignored', raw: 'x' });
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.platformSubscriptions.findFirst).not.toHaveBeenCalled();
    });

    it('no-ops when the event carries no subscription id', async () => {
      const result = await service.applyBillingEvent('razorpay', { type: 'charge_succeeded', raw: 'subscription.charged' });
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.platformSubscriptions.findFirst).not.toHaveBeenCalled();
    });

    it('acknowledges but does nothing when no matching subscription is found', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(null);
      const result = await service.applyBillingEvent('razorpay', { type: 'charge_succeeded', gatewaySubscriptionId: 'unknown', raw: 'subscription.charged' });
      expect(result).toEqual({ acknowledged: true });
      expect(prisma.platformSubscriptions.update).not.toHaveBeenCalled();
    });

    it('subscription_activated: activates, confirms the mandate, and syncs entitlements', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      prisma.clientOrganizations.findUnique.mockResolvedValue({ owner_user_id: 'owner-1' });
      await service.applyBillingEvent('razorpay', { type: 'subscription_activated', gatewaySubscriptionId: 'rzp_sub_1', raw: 'subscription.activated' });
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'active', mandate_status: 'confirmed' } });
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', 'plan-1');
      expect(notificationTrigger.dispatch).toHaveBeenCalled();
    });

    it('charge_succeeded: marks the pending invoice paid and advances the period by the real billing_period', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      prisma.platformInvoices.findFirst.mockResolvedValue({ id: 'inv-1', status: 'pending' });
      prisma.planVersions.findUnique.mockResolvedValue({ billing_period: 'annual' });

      await service.applyBillingEvent('razorpay', { type: 'charge_succeeded', gatewaySubscriptionId: 'rzp_sub_1', gatewayPaymentId: 'pay_1', raw: 'subscription.charged' });

      expect(prisma.platformInvoices.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-1' }, data: expect.objectContaining({ status: 'paid', gateway_payment_id: 'pay_1' }) }),
      );
      const updateCall = prisma.platformSubscriptions.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('active');
      const expectedNextEnd = new Date('2027-10-01T00:00:00Z');
      expect(updateCall.data.current_period_end).toEqual(expectedNextEnd);
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', 'plan-1');
    });

    it('charge_succeeded on a cancel_at_period_end subscription finalizes cancellation instead of renewing', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue({ ...subscription, cancel_at_period_end: true });
      prisma.platformInvoices.findFirst.mockResolvedValue(null);

      await service.applyBillingEvent('razorpay', { type: 'charge_succeeded', gatewaySubscriptionId: 'rzp_sub_1', raw: 'subscription.charged' });

      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
      );
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
    });

    it('charge_failed: sets past_due, logs a dunning event, keeps entitlements untouched, notifies the org', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      prisma.clientOrganizations.findUnique.mockResolvedValue({ owner_user_id: 'owner-1' });
      await service.applyBillingEvent('razorpay', { type: 'charge_failed', gatewaySubscriptionId: 'rzp_sub_1', raw: 'payment.failed' });
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { status: 'past_due' } });
      expect(prisma.platformDunningEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ event_type: 'payment_failed' }) }),
      );
      expect(organizationsService.assignPlan).not.toHaveBeenCalled();
      expect(notificationTrigger.dispatch).toHaveBeenCalled();
    });

    it('pre_debit_notice_sent: stamps the pending invoice with the RBI 24h-notice audit fields', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      prisma.platformInvoices.findFirst.mockResolvedValue({ id: 'inv-1', amount_paise: 500000 });
      await service.applyBillingEvent('razorpay', { type: 'pre_debit_notice_sent', gatewaySubscriptionId: 'rzp_sub_1', amountPaise: 500000, raw: 'subscription.pending' });
      expect(prisma.platformInvoices.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-1' }, data: expect.objectContaining({ pre_debit_notice_amount_paise: 500000 }) }),
      );
    });

    it('mandate_paused: records the mandate status without touching subscription status or entitlements', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      await service.applyBillingEvent('razorpay', { type: 'mandate_paused', gatewaySubscriptionId: 'rzp_sub_1', raw: 'subscription.paused' });
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { mandate_status: 'paused' } });
      expect(organizationsService.assignPlan).not.toHaveBeenCalled();
    });

    it('mandate_revoked: cancels the subscription and revokes entitlements', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      await service.applyBillingEvent('razorpay', { type: 'mandate_revoked', gatewaySubscriptionId: 'rzp_sub_1', raw: 'mandate.revoked' });
      expect(prisma.platformSubscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled', mandate_status: 'revoked' }) }),
      );
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
    });

    it('subscription_cancelled: cancels the subscription and revokes entitlements', async () => {
      prisma.platformSubscriptions.findFirst.mockResolvedValue(subscription);
      await service.applyBillingEvent('razorpay', { type: 'subscription_cancelled', gatewaySubscriptionId: 'rzp_sub_1', raw: 'subscription.cancelled' });
      expect(organizationsService.assignPlan).toHaveBeenCalledWith('org-1', null);
    });
  });

  describe('listInvoices / listTransactions', () => {
    it('filters by subscription_id, client_org_id, and status together', async () => {
      prisma.platformInvoices.findMany.mockResolvedValue([]);
      await service.listInvoices('sub-1', 'org-1', 'paid');
      expect(prisma.platformInvoices.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subscription_id: 'sub-1', client_org_id: 'org-1', status: 'paid' } }),
      );
    });

    it('converts amount from paise to rupees', async () => {
      prisma.platformInvoices.findMany.mockResolvedValue([
        { id: 'inv-1', subscription_id: 'sub-1', client_org: { id: 'org-1', name: 'X' }, invoice_number: 'PLAT-INV/2026-27/00001', amount_paise: 500000, status: 'paid', due_date: new Date(), gateway: 'razorpay', afa_required: false, created_at: new Date() },
      ]);
      const rows = await service.listInvoices();
      expect(rows[0].amount).toBe(5000);
    });

    it('listTransactions delegates to listInvoices with only a status filter', async () => {
      prisma.platformInvoices.findMany.mockResolvedValue([]);
      await service.listTransactions('failed');
      expect(prisma.platformInvoices.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'failed' } }));
    });
  });

  describe('retryInvoice', () => {
    it('rejects a nonexistent invoice', async () => {
      prisma.platformInvoices.findUnique.mockResolvedValue(null);
      const result = await service.retryInvoice('nope');
      expect(result.success).toBe(false);
    });

    it('rejects an already-paid invoice', async () => {
      prisma.platformInvoices.findUnique.mockResolvedValue({ id: 'inv-1', status: 'paid', subscription_id: 'sub-1' });
      const result = await service.retryInvoice('inv-1');
      expect(result.success).toBe(false);
      expect(prisma.platformDunningEvents.create).not.toHaveBeenCalled();
    });

    it('logs a retry_attempted dunning event for a failed invoice', async () => {
      prisma.platformInvoices.findUnique.mockResolvedValue({ id: 'inv-1', status: 'failed', subscription_id: 'sub-1' });
      const result = await service.retryInvoice('inv-1');
      expect(result.success).toBe(true);
      expect(prisma.platformDunningEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscription_id: 'sub-1', invoice_id: 'inv-1', event_type: 'retry_attempted' }) }),
      );
    });
  });

  describe('notifyOrg', () => {
    it('notifies the org owner directly when one is linked', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ owner_user_id: 'owner-1' });
      await service.notifyOrg('org-1', 'platform_payment_failed', { title: 't', message: 'm', type: 'payment' });
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith('owner-1', 'platform_payment_failed', expect.objectContaining({ title: 't' }));
      expect(prisma.userProfiles.findMany).not.toHaveBeenCalled();
    });

    it('falls back to every admin/manager in the org when there is no linked owner', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ owner_user_id: null });
      prisma.userProfiles.findMany.mockResolvedValue([{ id: 'mgr-1' }, { id: 'mgr-2' }]);
      await service.notifyOrg('org-1', 'platform_payment_failed', { title: 't', message: 'm', type: 'payment' });
      expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
    });

    it('never throws when a dispatch fails for one recipient', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue({ owner_user_id: 'owner-1' });
      notificationTrigger.dispatch.mockRejectedValue(new Error('down'));
      await expect(service.notifyOrg('org-1', 'x', { title: 't', message: 'm', type: 'payment' })).resolves.toBeUndefined();
    });
  });

  describe('getCredentials', () => {
    it('reads Razorpay credentials from the platform env vars', () => {
      const creds = service.getCredentials('razorpay');
      expect(creds).toEqual({ key_id: 'rzp_test', key_secret: 'secret', webhook_secret: 'whsec' });
    });

    it('returns an empty object for an unknown gateway', () => {
      expect(service.getCredentials('paypal')).toEqual({});
    });
  });
});
