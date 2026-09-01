import * as crypto from 'crypto';
import { stripeProvider } from './stripe.provider';

// REQ178/180 — no real Stripe test credentials exist in this environment;
// these are hand-derived-fixture unit tests against Stripe's own
// published API contract (form-encoded requests, Checkout Sessions,
// Stripe-Signature scheme), not a live call. Flagged honestly, matching
// this codebase's own established convention.
describe('stripeProvider', () => {
  const credentials = { secret_key: 'sk_test_123', webhook_secret: 'whsec_stripe_test' };

  describe('createSubscription', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('creates a customer, a price, then a Checkout Session, posting form-encoded bodies throughout', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cus_1' }) }) // POST /customers
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'price_1' }) }) // POST /prices
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1' }) }); // POST /checkout/sessions
      global.fetch = fetchMock as any;

      const result = await stripeProvider.createSubscription(credentials, {
        planVersionId: 'pv-1',
        amountPaise: 500000,
        billingPeriod: 'monthly',
        customerName: 'Test Clinic',
        customerEmail: 'org@example.com',
        mandateMaxAmountPaise: 500000,
      });

      expect(result).toEqual({
        gatewayCustomerId: 'cus_1',
        gatewaySubscriptionId: 'cs_test_1',
        mandateStatus: 'pending',
        authenticationUrl: 'https://checkout.stripe.com/pay/cs_test_1',
      });

      for (const call of fetchMock.mock.calls) {
        const [, init] = call;
        expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(init.headers['Authorization']).toBe('Bearer sk_test_123');
        expect(typeof init.body).toBe('string'); // URLSearchParams-encoded, not JSON
      }

      const [customerUrl] = fetchMock.mock.calls[0];
      expect(customerUrl).toBe('https://api.stripe.com/v1/customers');

      const [priceUrl, priceInit] = fetchMock.mock.calls[1];
      expect(priceUrl).toBe('https://api.stripe.com/v1/prices');
      const priceParams = new URLSearchParams(priceInit.body);
      expect(priceParams.get('unit_amount')).toBe('500000');
      expect(priceParams.get('currency')).toBe('inr');
      expect(priceParams.get('recurring[interval]')).toBe('month');

      const [sessionUrl, sessionInit] = fetchMock.mock.calls[2];
      expect(sessionUrl).toBe('https://api.stripe.com/v1/checkout/sessions');
      const sessionParams = new URLSearchParams(sessionInit.body);
      expect(sessionParams.get('mode')).toBe('subscription');
      expect(sessionParams.get('customer')).toBe('cus_1');
      expect(sessionParams.get('line_items[0][price]')).toBe('price_1');
    });

    it('uses a year interval for an annual billing period', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cus_1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'price_1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1' }) });
      global.fetch = fetchMock as any;
      await stripeProvider.createSubscription(credentials, {
        planVersionId: 'pv-1',
        amountPaise: 6000000,
        billingPeriod: 'annual',
        customerName: 'Test Clinic',
        customerEmail: 'org@example.com',
        mandateMaxAmountPaise: 6000000,
      });
      const priceParams = new URLSearchParams(fetchMock.mock.calls[1][1].body);
      expect(priceParams.get('recurring[interval]')).toBe('year');
    });

    it('throws with the Stripe error message when customer creation fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Invalid API key' } }) }) as any;
      await expect(
        stripeProvider.createSubscription(credentials, {
          planVersionId: 'pv-1',
          amountPaise: 500000,
          billingPeriod: 'monthly',
          customerName: 'X',
          customerEmail: 'x@example.com',
          mandateMaxAmountPaise: 500000,
        }),
      ).rejects.toThrow('Invalid API key');
    });

    it('throws when price creation fails after a successful customer create', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'cus_1' }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'Invalid currency' } }) });
      global.fetch = fetchMock as any;
      await expect(
        stripeProvider.createSubscription(credentials, {
          planVersionId: 'pv-1',
          amountPaise: 500000,
          billingPeriod: 'monthly',
          customerName: 'X',
          customerEmail: 'x@example.com',
          mandateMaxAmountPaise: 500000,
        }),
      ).rejects.toThrow('Invalid currency');
    });
  });

  describe('cancelSubscription', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('issues a DELETE with no body for an immediate cancel', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_1' }) });
      global.fetch = fetchMock as any;
      const result = await stripeProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_1', immediately: true });
      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_1');
      expect(init.method).toBe('DELETE');
    });

    it('posts cancel_at_period_end=true for a graceful cancel', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_1' }) });
      global.fetch = fetchMock as any;
      await stripeProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_1', immediately: false });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_1');
      const params = new URLSearchParams(init.body);
      expect(params.get('cancel_at_period_end')).toBe('true');
    });

    it('returns a failure, never throws, on a gateway error', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'No such subscription' } }) }) as any;
      const result = await stripeProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_x', immediately: true });
      expect(result).toEqual({ success: false, error: 'No such subscription' });
    });

    it('returns a failure, never throws, when fetch itself rejects', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;
      const result = await stripeProvider.cancelSubscription(credentials, { gatewaySubscriptionId: 'sub_x', immediately: true });
      expect(result).toEqual({ success: false, error: 'network down' });
    });
  });

  describe('verifyWebhookSignature', () => {
    function sign(rawBody: Buffer, secret: string, timestamp: number) {
      const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
      const v1 = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      return `t=${timestamp},v1=${v1}`;
    }

    it('accepts a genuine signature within the 5-minute tolerance window', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'invoice.payment_succeeded' }));
      const header = sign(rawBody, credentials.webhook_secret, Math.floor(Date.now() / 1000));
      expect(stripeProvider.verifyWebhookSignature(credentials, rawBody, { 'stripe-signature': header })).toBe(true);
    });

    it('rejects a signature computed under the wrong secret', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'invoice.payment_succeeded' }));
      const header = sign(rawBody, 'wrong-secret', Math.floor(Date.now() / 1000));
      expect(stripeProvider.verifyWebhookSignature(credentials, rawBody, { 'stripe-signature': header })).toBe(false);
    });

    it('rejects a timestamp older than 5 minutes (replay protection)', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'invoice.payment_succeeded' }));
      const staleTimestamp = Math.floor(Date.now() / 1000) - 600;
      const header = sign(rawBody, credentials.webhook_secret, staleTimestamp);
      expect(stripeProvider.verifyWebhookSignature(credentials, rawBody, { 'stripe-signature': header })).toBe(false);
    });

    it('rejects a missing signature header', () => {
      expect(stripeProvider.verifyWebhookSignature(credentials, Buffer.from('{}'), {})).toBe(false);
    });

    it('rejects a malformed header with no t= or v1=', () => {
      expect(stripeProvider.verifyWebhookSignature(credentials, Buffer.from('{}'), { 'stripe-signature': 'garbage' })).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('maps checkout.session.completed to subscription_activated', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'checkout.session.completed', data: { object: { subscription: 'sub_1' } } }));
      expect(stripeProvider.parseWebhookEvent(rawBody)).toEqual(
        expect.objectContaining({ type: 'subscription_activated', gatewaySubscriptionId: 'sub_1' }),
      );
    });

    it('maps invoice.payment_succeeded to charge_succeeded with invoice/payment ids and amount', () => {
      const rawBody = Buffer.from(
        JSON.stringify({
          type: 'invoice.payment_succeeded',
          data: { object: { id: 'in_1', subscription: 'sub_1', payment_intent: 'pi_1', amount_paid: 500000 } },
        }),
      );
      expect(stripeProvider.parseWebhookEvent(rawBody)).toEqual(
        expect.objectContaining({
          type: 'charge_succeeded',
          gatewaySubscriptionId: 'sub_1',
          gatewayInvoiceId: 'in_1',
          gatewayPaymentId: 'pi_1',
          amountPaise: 500000,
        }),
      );
    });

    it('maps invoice.payment_failed to charge_failed', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'invoice.payment_failed', data: { object: { id: 'in_1', subscription: 'sub_1' } } }));
      expect(stripeProvider.parseWebhookEvent(rawBody)).toEqual(
        expect.objectContaining({ type: 'charge_failed', gatewaySubscriptionId: 'sub_1', gatewayInvoiceId: 'in_1' }),
      );
    });

    it('maps customer.subscription.deleted to subscription_cancelled', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } }));
      expect(stripeProvider.parseWebhookEvent(rawBody)).toEqual(expect.objectContaining({ type: 'subscription_cancelled', gatewaySubscriptionId: 'sub_1' }));
    });

    it('maps an unrecognised event type to ignored', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'customer.updated', data: { object: {} } }));
      expect(stripeProvider.parseWebhookEvent(rawBody)).toEqual(expect.objectContaining({ type: 'ignored', raw: 'customer.updated' }));
    });
  });
});
