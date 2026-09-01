import * as crypto from 'crypto';
import { cashfreeProvider } from './cashfree.provider';

// REQ175 — no real Cashfree sandbox credentials exist in this environment;
// these are hand-derived-fixture unit tests against Cashfree's published
// contract, not a live call. Flagged honestly, matching this codebase's
// own established convention (see msg91.provider.ts).
describe('cashfreeProvider', () => {
  const credentials = { client_id: 'cf_client_id', client_secret: 'cf_client_secret' };

  describe('verifyWebhookSignature', () => {
    it('accepts base64(HMAC-SHA256(timestamp + rawBody, client_secret))', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' }));
      const timestamp = '1735689600';
      const expected = crypto.createHmac('sha256', credentials.client_secret).update(timestamp + rawBody.toString('utf8')).digest('base64');
      const result = cashfreeProvider.verifyWebhookSignature(credentials, rawBody, {
        'x-webhook-signature': expected,
        'x-webhook-timestamp': timestamp,
      });
      expect(result).toBe(true);
    });

    it('rejects a signature computed under the wrong client_secret', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' }));
      const timestamp = '1735689600';
      const wrong = crypto.createHmac('sha256', 'wrong-secret').update(timestamp + rawBody.toString('utf8')).digest('base64');
      expect(cashfreeProvider.verifyWebhookSignature(credentials, rawBody, { 'x-webhook-signature': wrong, 'x-webhook-timestamp': timestamp })).toBe(false);
    });

    it('rejects when the timestamp header is missing (changes the signed input)', () => {
      const rawBody = Buffer.from('{}');
      const expected = crypto.createHmac('sha256', credentials.client_secret).update('1735689600' + rawBody.toString('utf8')).digest('base64');
      expect(cashfreeProvider.verifyWebhookSignature(credentials, rawBody, { 'x-webhook-signature': expected })).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('maps PAYMENT_SUCCESS_WEBHOOK to payment_captured', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { link: { link_id: 'link_1' }, payment: { cf_payment_id: 'cfpay_1' } } }));
      expect(cashfreeProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'payment_captured',
        gatewayOrderId: 'link_1',
        gatewayPaymentId: 'cfpay_1',
        raw: 'PAYMENT_SUCCESS_WEBHOOK',
      });
    });

    it('maps REFUND_STATUS_WEBHOOK to refund_processed', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'REFUND_STATUS_WEBHOOK', data: { payment: { cf_payment_id: 'cfpay_1' }, refund: { cf_refund_id: 'cfrfnd_1' } } }));
      expect(cashfreeProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'refund_processed',
        gatewayPaymentId: 'cfpay_1',
        gatewayRefundId: 'cfrfnd_1',
        raw: 'REFUND_STATUS_WEBHOOK',
      });
    });

    it('maps an unrecognised event type to ignored', () => {
      const rawBody = Buffer.from(JSON.stringify({ type: 'SOME_OTHER_EVENT' }));
      expect(cashfreeProvider.parseWebhookEvent(rawBody)).toEqual({ type: 'ignored', raw: 'SOME_OTHER_EVENT' });
    });
  });

  describe('createOrder', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('creates a Payment Link and returns a redirect checkout', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ link_id: 'link_1', link_url: 'https://payments.cashfree.com/links/link_1' }) }) as any;
      const result = await cashfreeProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' });
      expect(result.checkoutType).toBe('redirect');
      expect(result.gatewayOrderId).toBe('link_1');
      expect(result.redirectUrl).toBe('https://payments.cashfree.com/links/link_1');
    });
  });

  describe('refund', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    // REQ175 -- Cashfree's refund endpoint is scoped by the Payment LINK id
    // (gatewayOrderId), never cf_payment_id -- a real bug found and fixed
    // in the service call site while writing this test.
    it('refunds against the link id (gatewayOrderId), not the payment id', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ cf_refund_id: 'cfrfnd_1' }) });
      global.fetch = fetchMock as any;
      const result = await cashfreeProvider.refund(credentials, { gatewayPaymentId: 'cfpay_1', gatewayOrderId: 'link_1', amountPaise: 20000 });
      expect(result).toEqual({ success: true, gatewayRefundId: 'cfrfnd_1' });
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.cashfree.com/pg/links/link_1/refunds');
    });

    it('fails cleanly with no gatewayOrderId on file, calling no gateway', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as any;
      const result = await cashfreeProvider.refund(credentials, { gatewayPaymentId: 'cfpay_1', amountPaise: 20000 });
      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
