import * as crypto from 'crypto';
import { payuProvider } from './payu.provider';

// REQ175 — no real PayU sandbox credentials exist in this environment;
// these are hand-derived-fixture unit tests against PayU's own published
// hash scheme, not a live call. Flagged honestly.
describe('payuProvider', () => {
  const credentials = { merchant_key: 'payu_key', salt: 'payu_salt' };

  function sha512(input: string): string {
    return crypto.createHash('sha512').update(input).digest('hex');
  }

  describe('createOrder', () => {
    it('returns a form_post checkout with a hash matching PayU\'s documented request-hash formula', async () => {
      const result = await payuProvider.createOrder(credentials, { amountPaise: 50000, receipt: 'appt-1' });
      expect(result.checkoutType).toBe('form_post');
      expect(result.formPostUrl).toBe('https://secure.payu.in/_payment');
      const fields = result.formFields!;
      expect(fields.key).toBe('payu_key');
      expect(fields.amount).toBe('500.00');
      // key|txnid|amount|productinfo|firstname|email|udf1..5||||||salt
      const expectedHash = sha512(
        `${credentials.merchant_key}|${fields.txnid}|${fields.amount}|${fields.productinfo}|${fields.firstname}|${fields.email}|||||||||||${credentials.salt}`,
      );
      expect(fields.hash).toBe(expectedHash);
    });
  });

  describe('verifyWebhookSignature (reverse hash)', () => {
    function reverseHash(fields: Record<string, string>): string {
      // salt|status|||||||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
      return sha512(
        `${credentials.salt}|${fields.status}|||||||||||${fields.email}|${fields.firstname}|${fields.productinfo}|${fields.amount}|${fields.txnid}|${credentials.merchant_key}`,
      );
    }

    it('accepts a genuine reverse hash over a success response', () => {
      const fields = { status: 'success', txnid: 'appt-1-123', amount: '500.00', productinfo: 'Appointment appt-1', firstname: 'Patient', email: 'patient@example.com' };
      const hash = reverseHash(fields);
      const rawBody = Buffer.from(new URLSearchParams({ ...fields, hash }).toString());
      expect(payuProvider.verifyWebhookSignature(credentials, rawBody, {})).toBe(true);
    });

    it('rejects a hash computed under the wrong salt', () => {
      const fields = { status: 'success', txnid: 'appt-1-123', amount: '500.00', productinfo: 'Appointment appt-1', firstname: 'Patient', email: 'patient@example.com' };
      const wrongHash = sha512(`wrong-salt|${fields.status}|||||||||||${fields.email}|${fields.firstname}|${fields.productinfo}|${fields.amount}|${fields.txnid}|${credentials.merchant_key}`);
      const rawBody = Buffer.from(new URLSearchParams({ ...fields, hash: wrongHash }).toString());
      expect(payuProvider.verifyWebhookSignature(credentials, rawBody, {})).toBe(false);
    });

    it('rejects a body with no hash field at all', () => {
      const rawBody = Buffer.from(new URLSearchParams({ status: 'success', txnid: 'x' }).toString());
      expect(payuProvider.verifyWebhookSignature(credentials, rawBody, {})).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('maps status=success to payment_captured, keyed by mihpayid', () => {
      const rawBody = Buffer.from(new URLSearchParams({ status: 'success', txnid: 'appt-1-123', mihpayid: 'mihpay_1' }).toString());
      expect(payuProvider.parseWebhookEvent(rawBody)).toEqual({
        type: 'payment_captured',
        gatewayOrderId: 'appt-1-123',
        gatewayPaymentId: 'mihpay_1',
        raw: 'success',
      });
    });

    it('maps status=failure to payment_failed', () => {
      const rawBody = Buffer.from(new URLSearchParams({ status: 'failure', txnid: 'appt-1-123' }).toString());
      expect(payuProvider.parseWebhookEvent(rawBody).type).toBe('payment_failed');
    });

    it('maps any other status to ignored', () => {
      const rawBody = Buffer.from(new URLSearchParams({ status: 'pending' }).toString());
      expect(payuProvider.parseWebhookEvent(rawBody)).toEqual({ type: 'ignored', raw: 'pending' });
    });
  });

  describe('refund', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('signs the cancel_refund_transaction command hash correctly and returns success', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 1, request_id: 'req_1' }) });
      global.fetch = fetchMock as any;
      const result = await payuProvider.refund(credentials, { gatewayPaymentId: 'mihpay_1', amountPaise: 20000 });
      expect(result).toEqual({ success: true, gatewayRefundId: 'req_1' });
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
      const expectedHash = sha512(`${credentials.merchant_key}|cancel_refund_transaction|mihpay_1|${credentials.salt}`);
      expect(body.get('hash')).toBe(expectedHash);
    });

    it('returns a failure when PayU reports status !== 1, without throwing', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 0, msg: 'Invalid transaction' }) }) as any;
      const result = await payuProvider.refund(credentials, { gatewayPaymentId: 'mihpay_1', amountPaise: 20000 });
      expect(result).toEqual({ success: false, error: 'Invalid transaction' });
    });
  });
});
