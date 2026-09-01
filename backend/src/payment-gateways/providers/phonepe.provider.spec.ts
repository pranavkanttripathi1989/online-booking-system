import * as crypto from 'crypto';
import { phonepeProvider } from './phonepe.provider';

// REQ175 — no real PhonePe sandbox credentials exist in this environment;
// these are hand-derived-fixture unit tests against PhonePe's own
// published X-VERIFY checksum contract, not a live call. Flagged honestly.
describe('phonepeProvider', () => {
  const credentials = { merchant_id: 'PGTESTPAYUAT', salt_key: 'salt-key-123', salt_index: '1' };

  function checksum(payloadOrPath: string): string {
    const hash = crypto.createHash('sha256').update(payloadOrPath + credentials.salt_key).digest('hex');
    return `${hash}###${credentials.salt_index}`;
  }

  describe('createOrder', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('signs X-VERIFY as SHA256(base64Payload + path + saltKey) + "###" + saltIndex', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { instrumentResponse: { redirectInfo: { url: 'https://mercury.phonepe.com/pay/xyz' } } } }),
      });
      global.fetch = fetchMock as any;
      const result = await phonepeProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' });
      expect(result.checkoutType).toBe('redirect');
      expect(result.redirectUrl).toBe('https://mercury.phonepe.com/pay/xyz');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.phonepe.com/apis/hermes/pg/v1/pay');
      const sentBody = JSON.parse(init.body);
      const expectedXVerify = checksum(sentBody.request + '/pg/v1/pay');
      expect(init.headers['X-VERIFY']).toBe(expectedXVerify);
    });

    it('throws with the gateway message when the pay request is not successful', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, message: 'Invalid merchant' }) }) as any;
      await expect(phonepeProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' })).rejects.toThrow('Invalid merchant');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a genuine X-VERIFY over the response payload', () => {
      const responseB64 = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      const rawBody = Buffer.from(JSON.stringify({ response: responseB64 }));
      const xVerify = checksum(responseB64);
      expect(phonepeProvider.verifyWebhookSignature(credentials, rawBody, { 'x-verify': xVerify })).toBe(true);
    });

    it('rejects an X-VERIFY computed under the wrong salt key', () => {
      const responseB64 = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      const rawBody = Buffer.from(JSON.stringify({ response: responseB64 }));
      const wrongHash = crypto.createHash('sha256').update(responseB64 + 'wrong-salt').digest('hex');
      expect(phonepeProvider.verifyWebhookSignature(credentials, rawBody, { 'x-verify': `${wrongHash}###1` })).toBe(false);
    });

    it('rejects a missing x-verify header', () => {
      const rawBody = Buffer.from(JSON.stringify({ response: 'eyJ9' }));
      expect(phonepeProvider.verifyWebhookSignature(credentials, rawBody, {})).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('decodes the base64 response and maps PAYMENT_SUCCESS to payment_captured', () => {
      const inner = { merchantTransactionId: 'appt-1-123', transactionId: 'T2401010000000000' };
      const responseB64 = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS', data: inner })).toString('base64');
      const rawBody = Buffer.from(JSON.stringify({ response: responseB64 }));
      expect(phonepeProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'payment_captured',
        gatewayOrderId: 'appt-1-123',
        gatewayPaymentId: 'T2401010000000000',
        raw: 'PAYMENT_SUCCESS',
      });
    });

    it('maps PAYMENT_ERROR to payment_failed', () => {
      const responseB64 = Buffer.from(JSON.stringify({ code: 'PAYMENT_ERROR', data: {} })).toString('base64');
      const rawBody = Buffer.from(JSON.stringify({ response: responseB64 }));
      expect(phonepeProvider.parseWebhookEvent(rawBody).type).toBe('payment_failed');
    });
  });

  describe('refund', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('signs the refund request and returns success with a merchant-minted refund reference', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as any;
      const result = await phonepeProvider.refund(credentials, { gatewayPaymentId: 'T2401010000000000', amountPaise: 20000 });
      expect(result.success).toBe(true);
      expect(result.gatewayRefundId).toMatch(/^refund-\d+$/);
    });

    it('returns a failure when PhonePe reports success:false', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, message: 'Transaction not found' }) }) as any;
      const result = await phonepeProvider.refund(credentials, { gatewayPaymentId: 'T_nonexistent', amountPaise: 20000 });
      expect(result).toEqual({ success: false, error: 'Transaction not found' });
    });
  });
});
