import * as crypto from 'crypto';
import { razorpaySubscriptionsProvider } from './razorpay-subscriptions.provider';

// REQ178/180 — no real Razorpay Subscriptions-product test credentials
// exist in this environment; these are hand-derived-fixture unit tests
// against Razorpay's own published contract, not a live call. Flagged
// honestly, matching this codebase's own established convention.
describe('razorpaySubscriptionsProvider', () => {
  const credentials = { key_id: 'rzp_test_key', key_secret: 'rzp_test_secret', webhook_secret: 'whsec_test' };

  describe('createSubscription', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('creates a Razorpay plan then a subscription against it, returning the hosted authentication URL', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'plan_rzp_1' }) }) // POST /plans
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub_rzp_1', short_url: 'https://rzp.io/i/xyz' }) }); // POST /subscriptions
      global.fetch = fetchMock as any;

      const result = await razorpaySubscriptionsProvider.createSubscription(credentials, {
        planVersionId: 'pv-1',
        amountPaise: 500000,
        billingPeriod: 'monthly',
        customerName: 'Test Clinic',
        customerEmail: 'org@example.com',
        mandateMaxAmountPaise: 500000,
      });

      expect(result).toEqual({
        gatewayCustomerId: 'sub_rzp_1',
        gatewaySubscriptionId: 'sub_rzp_1',
        mandateStatus: 'pending',
        authenticationUrl: 'https://rzp.io/i/xyz',
      });

      const [planUrl, planInit] = fetchMock.mock.calls[0];
      expect(planUrl).toBe('https://api.razorpay.com/v1/plans');
      const planBody = JSON.parse(planInit.body);
      expect(planBody.period).toBe('monthly');
      expect(planBody.item.amount).toBe(500000);
      expect(planBody.item.currency).toBe('INR');

      const [subUrl, subInit] = fetchMock.mock.calls[1];
      expect(subUrl).toBe('https://api.razorpay.com/v1/subscriptions');
      const subBody = JSON.parse(subInit.body);
      expect(subBody.plan_id).toBe('plan_rzp_1');
      expect(subBody.total_count).toBe(120); // monthly -> 10 years of cycles
    });

    it('uses a 10-cycle total_count for an annual plan', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'plan_rzp_1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub_rzp_1', short_url: 'https://rzp.io/i/xyz' }) });
      global.fetch = fetchMock as any;
      await razorpaySubscriptionsProvider.createSubscription(credentials, {
        planVersionId: 'pv-1',
        amountPaise: 6000000,
        billingPeriod: 'annual',
        customerName: 'Test Clinic',
        customerEmail: 'org@example.com',
        mandateMaxAmountPaise: 1500000,
      });
      const subBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(subBody.total_count).toBe(10);
    });

    it('throws with the gateway error description when plan creation fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'Invalid key' } }) }) as any;
      await expect(
        razorpaySubscriptionsProvider.createSubscription(credentials, {
          planVersionId: 'pv-1',
          amountPaise: 500000,
          billingPeriod: 'monthly',
          customerName: 'X',
          customerEmail: 'x@example.com',
          mandateMaxAmountPaise: 500000,
        }),
      ).rejects.toThrow('Invalid key');
    });
  });

  describe('cancelSubscription', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('cancel_at_cycle_end=0 for an immediate cancel', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_rzp_1' }) });
      global.fetch = fetchMock as any;
      const result = await razorpaySubscriptionsProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_rzp_1', immediately: true });
      expect(result).toEqual({ success: true });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).cancel_at_cycle_end).toBe(0);
    });

    it('cancel_at_cycle_end=1 for a graceful cancel', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_rzp_1' }) });
      global.fetch = fetchMock as any;
      await razorpaySubscriptionsProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_rzp_1', immediately: false });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).cancel_at_cycle_end).toBe(1);
    });

    it('returns a failure, never throws, on a gateway error', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'Not found' } }) }) as any;
      const result = await razorpaySubscriptionsProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_x', immediately: true });
      expect(result).toEqual({ success: false, error: 'Not found' });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a genuine HMAC-SHA256 of the raw body, same scheme as the existing Razorpay Orders webhook', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'subscription.charged' }));
      const signature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
      expect(razorpaySubscriptionsProvider.verifyWebhookSignature(credentials, rawBody, { 'x-razorpay-signature': signature })).toBe(true);
    });

    it('rejects a signature computed under the wrong secret', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'subscription.charged' }));
      const wrong = crypto.createHmac('sha256', 'not-the-secret').update(rawBody).digest('hex');
      expect(razorpaySubscriptionsProvider.verifyWebhookSignature(credentials, rawBody, { 'x-razorpay-signature': wrong })).toBe(false);
    });

    it('rejects a missing signature header', () => {
      expect(razorpaySubscriptionsProvider.verifyWebhookSignature(credentials, Buffer.from('{}'), {})).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('maps subscription.activated to subscription_activated', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'subscription.activated', payload: { subscription: { entity: { id: 'sub_1' } } } }));
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(rawBody)).toEqual(
        expect.objectContaining({ type: 'subscription_activated', gatewaySubscriptionId: 'sub_1' }),
      );
    });

    it('maps subscription.charged to charge_succeeded with payment and invoice ids', () => {
      const rawBody = Buffer.from(
        JSON.stringify({
          event: 'subscription.charged',
          payload: { subscription: { entity: { id: 'sub_1' } }, payment: { entity: { id: 'pay_1', amount: 500000 } }, invoice: { entity: { id: 'inv_1' } } },
        }),
      );
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(rawBody)).toEqual(
        expect.objectContaining({ type: 'charge_succeeded', gatewaySubscriptionId: 'sub_1', gatewayPaymentId: 'pay_1', gatewayInvoiceId: 'inv_1', amountPaise: 500000 }),
      );
    });

    it('maps payment.failed to charge_failed', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.failed', payload: { subscription: { entity: { id: 'sub_1' } } } }));
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(rawBody).type).toBe('charge_failed');
    });

    it('maps subscription.paused to mandate_paused and subscription.cancelled to subscription_cancelled', () => {
      const paused = Buffer.from(JSON.stringify({ event: 'subscription.paused', payload: { subscription: { entity: { id: 'sub_1' } } } }));
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(paused).type).toBe('mandate_paused');
      const cancelled = Buffer.from(JSON.stringify({ event: 'subscription.cancelled', payload: { subscription: { entity: { id: 'sub_1' } } } }));
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(cancelled).type).toBe('subscription_cancelled');
    });

    it('maps an unrecognised event type to ignored', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'plan.created' }));
      expect(razorpaySubscriptionsProvider.parseWebhookEvent(rawBody)).toEqual({ type: 'ignored', raw: 'plan.created' });
    });
  });
});
