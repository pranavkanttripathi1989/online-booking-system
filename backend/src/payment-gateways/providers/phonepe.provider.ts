import * as crypto from 'crypto';
import { PaymentGatewayProvider, CreateOrderParams, CreateOrderResult, RefundParams, RefundResult, NormalizedWebhookEvent } from './provider.interface';

// REQ175 — PhonePe Payment Gateway. No real PhonePe sandbox credentials
// exist in this environment to test an actual pay/callback/refund against
// — shaped against PhonePe's published X-VERIFY checksum contract, not
// fabricated, but flagged honestly rather than claimed as live-verified.
// Re-check the endpoint hosts/paths against PhonePe's current docs the
// first time real credentials land here.
const PAY_PATH = '/pg/v1/pay';
const REFUND_PATH = '/pg/v1/refund';
const BASE_URL = 'https://api.phonepe.com/apis/hermes';

function checksum(payloadOrPath: string, saltKey: string, saltIndex: string): string {
  const hash = crypto.createHash('sha256').update(payloadOrPath + saltKey).digest('hex');
  return `${hash}###${saltIndex}`;
}

export const phonepeProvider: PaymentGatewayProvider = {
  id: 'phonepe',
  label: 'PhonePe',
  fields: [
    { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
    { key: 'salt_key', label: 'Salt Key', type: 'password', required: true },
    { key: 'salt_index', label: 'Salt Index', type: 'text', required: true },
  ],

  async createOrder(credentials, params: CreateOrderParams): Promise<CreateOrderResult> {
    const merchantTransactionId = `${params.receipt}-${Date.now()}`;
    const payload = {
      merchantId: credentials.merchant_id,
      merchantTransactionId,
      merchantUserId: params.receipt,
      amount: params.amountPaise,
      redirectMode: 'REDIRECT',
      paymentInstrument: { type: 'PAY_PAGE' },
    };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = checksum(base64Payload + PAY_PATH, credentials.salt_key, credentials.salt_index);

    const res = await fetch(`${BASE_URL}${PAY_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify },
      body: JSON.stringify({ request: base64Payload }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
    };
    const redirectUrl = body.data?.instrumentResponse?.redirectInfo?.url;
    if (!res.ok || !body.success || !redirectUrl) {
      throw new Error(body.message ?? 'Failed to create PhonePe payment');
    }
    return { checkoutType: 'redirect', gatewayOrderId: merchantTransactionId, redirectUrl };
  },

  // PhonePe's callback carries the same X-VERIFY scheme over its own
  // base64 response body.
  verifyWebhookSignature(credentials, rawBody, headers) {
    const xVerifyHeader = headers['x-verify'];
    if (!xVerifyHeader || Array.isArray(xVerifyHeader)) return false;
    let response: { response?: string };
    try {
      response = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return false;
    }
    if (!response.response) return false;
    const expected = checksum(response.response, credentials.salt_key, credentials.salt_index);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(xVerifyHeader);
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  },

  parseWebhookEvent(rawBody): NormalizedWebhookEvent {
    const outer = JSON.parse(rawBody.toString('utf8')) as { response?: string };
    const decoded = outer.response ? JSON.parse(Buffer.from(outer.response, 'base64').toString('utf8')) : {};
    const code = decoded.code ?? '';
    const data = decoded.data ?? {};
    if (code === 'PAYMENT_SUCCESS') {
      return { type: 'payment_captured', gatewayOrderId: data.merchantTransactionId, gatewayPaymentId: data.transactionId, raw: code };
    }
    if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
      return { type: 'payment_failed', gatewayOrderId: data.merchantTransactionId, gatewayPaymentId: data.transactionId, raw: code };
    }
    return { type: 'ignored', raw: code };
  },

  async refund(credentials, params: RefundParams): Promise<RefundResult> {
    try {
      const merchantTransactionId = `refund-${Date.now()}`;
      const payload = {
        merchantId: credentials.merchant_id,
        merchantTransactionId,
        originalTransactionId: params.gatewayPaymentId,
        amount: params.amountPaise,
      };
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const xVerify = checksum(base64Payload + REFUND_PATH, credentials.salt_key, credentials.salt_index);
      const res = await fetch(`${BASE_URL}${REFUND_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify },
        body: JSON.stringify({ request: base64Payload }),
      });
      const body = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !body.success) {
        return { success: false, error: body.message ?? 'PhonePe refund failed' };
      }
      return { success: true, gatewayRefundId: merchantTransactionId };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'PhonePe refund request failed' };
    }
  },
};
