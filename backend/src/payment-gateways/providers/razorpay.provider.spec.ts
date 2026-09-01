import * as crypto from 'crypto';
import { razorpayProvider } from './razorpay.provider';

// REQ175 — the one adapter of the four that IS live-verifiable in this
// environment (a real sandbox account already works, exercised throughout
// this session). These are still hand-derived-fixture unit tests, not a
// live call, matching this codebase's own "re-derive the math by hand
// before trusting the test" discipline.
describe('razorpayProvider', () => {
  const credentials = { key_id: 'rzp_test_key', key_secret: 'rzp_test_secret', webhook_secret: 'whsec_test' };

  describe('verifyWebhookSignature', () => {
    it('accepts a signature that is a genuine HMAC-SHA256 of the raw body under the webhook secret', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const signature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
      const result = razorpayProvider.verifyWebhookSignature(credentials, rawBody, { 'x-razorpay-signature': signature });
      expect(result).toBe(true);
    });

    it('rejects a signature computed under the wrong secret', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const wrongSignature = crypto.createHmac('sha256', 'not-the-real-secret').update(rawBody).digest('hex');
      expect(razorpayProvider.verifyWebhookSignature(credentials, rawBody, { 'x-razorpay-signature': wrongSignature })).toBe(false);
    });

    it('rejects a signature computed over different bytes (tampered body)', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const signature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
      const tamperedBody = Buffer.from(JSON.stringify({ event: 'payment.captured', amount: 999999999 }));
      expect(razorpayProvider.verifyWebhookSignature(credentials, tamperedBody, { 'x-razorpay-signature': signature })).toBe(false);
    });

    it('rejects a missing signature header', () => {
      const rawBody = Buffer.from('{}');
      expect(razorpayProvider.verifyWebhookSignature(credentials, rawBody, {})).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('maps payment.captured to payment_captured with order/payment ids', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }));
      expect(razorpayProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'payment_captured',
        gatewayOrderId: 'order_1',
        gatewayPaymentId: 'pay_1',
        raw: 'payment.captured',
      });
    });

    it('maps refund.processed to refund_processed keyed by payment_id, not order_id', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_1' } } } }));
      expect(razorpayProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'refund_processed',
        gatewayPaymentId: 'pay_1',
        gatewayRefundId: 'rfnd_1',
        raw: 'refund.processed',
      });
    });

    it('maps an unrecognised event type to ignored', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'order.paid' }));
      expect(razorpayProvider.parseWebhookEvent(rawBody)).toEqual({ type: 'ignored', raw: 'order.paid' });
    });
  });

  describe('createOrder', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('posts amount/currency/receipt with Basic auth and returns a razorpay_widget checkout', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'order_abc' }) });
      global.fetch = fetchMock as any;
      const result = await razorpayProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' });
      expect(result).toEqual({ checkoutType: 'razorpay_widget', gatewayOrderId: 'order_abc', razorpayKeyId: 'rzp_test_key' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.razorpay.com/v1/orders');
      expect(JSON.parse(init.body)).toEqual({ amount: 50000, currency: 'INR', receipt: 'appt-1' });
      const expectedAuth = `Basic ${Buffer.from('rzp_test_key:rzp_test_secret').toString('base64')}`;
      expect(init.headers.Authorization).toBe(expectedAuth);
    });

    it('throws with the gateway-provided error description on a non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'Invalid key' } }) }) as any;
      await expect(razorpayProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' })).rejects.toThrow('Invalid key');
    });
  });

  describe('refund', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns success with the gateway refund id on a real refund response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'rfnd_1' }) }) as any;
      const result = await razorpayProvider.refund(credentials, { gatewayPaymentId: 'pay_1', amountPaise: 20000 });
      expect(result).toEqual({ success: true, gatewayRefundId: 'rfnd_1' });
    });

    it('returns a failure with the gateway error message rather than throwing', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { description: 'Refund amount exceeds captured amount' } }) }) as any;
      const result = await razorpayProvider.refund(credentials, { gatewayPaymentId: 'pay_1', amountPaise: 999999999 });
      expect(result).toEqual({ success: false, error: 'Refund amount exceeds captured amount' });
    });

    it('never throws even on a network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET')) as any;
      const result = await razorpayProvider.refund(credentials, { gatewayPaymentId: 'pay_1', amountPaise: 20000 });
      expect(result).toEqual({ success: false, error: 'ECONNRESET' });
    });
  });
});
