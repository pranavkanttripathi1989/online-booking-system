import * as crypto from 'crypto';
import { PaymentGatewayProvider, CreateOrderParams, CreateOrderResult, RefundParams, RefundResult, NormalizedWebhookEvent } from './provider.interface';

// REQ175 — extracted from appointment-payments.service.ts's own pre-existing
// createRazorpayOrder/handleRazorpayWebhook logic (live-verified against a
// real sandbox account since before this registry existed), not rewritten:
// same URL, same auth-header construction, same request/response shape, so
// this refactor is behaviour-preserving by construction. This is the one
// adapter of the four that IS live-verifiable in this environment.
const ORDERS_URL = 'https://api.razorpay.com/v1/orders';
const REFUND_URL = (paymentId: string) => `https://api.razorpay.com/v1/payments/${paymentId}/refund`;

function authHeader(credentials: Record<string, string>) {
  return `Basic ${Buffer.from(`${credentials.key_id}:${credentials.key_secret}`).toString('base64')}`;
}

export const razorpayProvider: PaymentGatewayProvider = {
  id: 'razorpay',
  label: 'Razorpay',
  fields: [
    { key: 'key_id', label: 'Key ID', type: 'text', required: true },
    { key: 'key_secret', label: 'Key Secret', type: 'password', required: true },
    { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: true },
  ],

  async createOrder(credentials, params: CreateOrderParams): Promise<CreateOrderResult> {
    const res = await fetch(ORDERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(credentials) },
      body: JSON.stringify({ amount: params.amountPaise, currency: 'INR', receipt: params.receipt }),
    });
    const order = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !order.id) {
      throw new Error(order.error?.description ?? 'Failed to create Razorpay order');
    }
    return { checkoutType: 'razorpay_widget', gatewayOrderId: order.id, razorpayKeyId: credentials.key_id };
  },

  verifyWebhookSignature(credentials, rawBody, headers) {
    const signatureHeader = headers['x-razorpay-signature'];
    if (!signatureHeader || Array.isArray(signatureHeader)) return false;
    const expectedSignature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signatureHeader, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  },

  parseWebhookEvent(rawBody): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } }; refund?: { entity?: { id?: string; payment_id?: string } } };
    };
    const eventType = event.event ?? '';
    if (eventType === 'payment.captured') {
      return { type: 'payment_captured', gatewayOrderId: event.payload?.payment?.entity?.order_id, gatewayPaymentId: event.payload?.payment?.entity?.id, raw: eventType };
    }
    if (eventType === 'payment.failed') {
      return { type: 'payment_failed', gatewayOrderId: event.payload?.payment?.entity?.order_id, gatewayPaymentId: event.payload?.payment?.entity?.id, raw: eventType };
    }
    if (eventType === 'refund.processed') {
      return { type: 'refund_processed', gatewayPaymentId: event.payload?.refund?.entity?.payment_id, gatewayRefundId: event.payload?.refund?.entity?.id, raw: eventType };
    }
    if (eventType === 'refund.failed') {
      return { type: 'refund_failed', gatewayPaymentId: event.payload?.refund?.entity?.payment_id, gatewayRefundId: event.payload?.refund?.entity?.id, raw: eventType };
    }
    return { type: 'ignored', raw: eventType };
  },

  async refund(credentials, params: RefundParams): Promise<RefundResult> {
    try {
      const res = await fetch(REFUND_URL(params.gatewayPaymentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader(credentials) },
        body: JSON.stringify({ amount: params.amountPaise }),
      });
      const body = (await res.json()) as { id?: string; error?: { description?: string } };
      if (!res.ok || !body.id) {
        return { success: false, error: body.error?.description ?? 'Razorpay refund failed' };
      }
      return { success: true, gatewayRefundId: body.id };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Razorpay refund request failed' };
    }
  },
};
