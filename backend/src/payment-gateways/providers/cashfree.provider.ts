import * as crypto from 'crypto';
import { PaymentGatewayProvider, CreateOrderParams, CreateOrderResult, RefundParams, RefundResult, NormalizedWebhookEvent } from './provider.interface';

// REQ175 — Cashfree Payment Gateway (PG API version 2023-08-01). No real
// Cashfree sandbox credentials exist in this environment to test an actual
// order/webhook/refund against (see REQ175's own doc) — shaped against
// Cashfree's published API contract, not fabricated, but flagged honestly
// rather than claimed as live-verified. Re-check endpoint paths/the API
// version header against Cashfree's current docs the first time real
// credentials land here, mirroring msg91.provider.ts's own precedent for
// this exact honesty convention.
//
// Uses the Payment Links API (POST /pg/links), not the Orders + JS-SDK
// checkout-session flow — Links directly returns a hosted-page URL,
// matching this registry's deliberate 'redirect' checkout shape rather
// than adding a second, gateway-specific frontend integration.
const LINKS_URL = 'https://api.cashfree.com/pg/links';
const REFUNDS_URL = (linkId: string) => `https://api.cashfree.com/pg/links/${linkId}/refunds`;
const API_VERSION = '2023-08-01';

function headers(credentials: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    'x-client-id': credentials.client_id,
    'x-client-secret': credentials.client_secret,
    'x-api-version': API_VERSION,
  };
}

export const cashfreeProvider: PaymentGatewayProvider = {
  id: 'cashfree',
  label: 'Cashfree',
  fields: [
    { key: 'client_id', label: 'Client ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
  ],

  async createOrder(credentials, params: CreateOrderParams): Promise<CreateOrderResult> {
    const linkId = `${params.receipt}-${Date.now()}`;
    const res = await fetch(LINKS_URL, {
      method: 'POST',
      headers: headers(credentials),
      body: JSON.stringify({
        link_id: linkId,
        link_amount: params.amountPaise / 100,
        link_currency: 'INR',
        link_purpose: `Appointment ${params.receipt}`,
        link_notify: { send_sms: false, send_email: false },
      }),
    });
    const body = (await res.json()) as { link_url?: string; link_id?: string; message?: string };
    if (!res.ok || !body.link_url) {
      throw new Error(body.message ?? 'Failed to create Cashfree payment link');
    }
    return { checkoutType: 'redirect', gatewayOrderId: body.link_id ?? linkId, redirectUrl: body.link_url };
  },

  // Cashfree's documented webhook scheme: base64(HMAC-SHA256(timestamp +
  // rawBody, client_secret)) against the x-webhook-signature header, with
  // x-webhook-timestamp supplying the timestamp component.
  verifyWebhookSignature(credentials, rawBody, headers) {
    const signatureHeader = headers['x-webhook-signature'];
    const timestampHeader = headers['x-webhook-timestamp'];
    if (!signatureHeader || Array.isArray(signatureHeader) || !timestampHeader || Array.isArray(timestampHeader)) return false;
    const expected = crypto
      .createHmac('sha256', credentials.client_secret)
      .update(timestampHeader + rawBody.toString('utf8'))
      .digest('base64');
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signatureHeader);
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  },

  parseWebhookEvent(rawBody): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      data?: { link?: { link_id?: string }; payment?: { cf_payment_id?: string }; refund?: { cf_refund_id?: string } };
    };
    const eventType = event.type ?? '';
    if (eventType === 'PAYMENT_LINK_EVENT' || eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
      return { type: 'payment_captured', gatewayOrderId: event.data?.link?.link_id, gatewayPaymentId: event.data?.payment?.cf_payment_id, raw: eventType };
    }
    if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
      return { type: 'payment_failed', gatewayOrderId: event.data?.link?.link_id, gatewayPaymentId: event.data?.payment?.cf_payment_id, raw: eventType };
    }
    if (eventType === 'REFUND_STATUS_WEBHOOK') {
      return { type: 'refund_processed', gatewayPaymentId: event.data?.payment?.cf_payment_id, gatewayRefundId: event.data?.refund?.cf_refund_id, raw: eventType };
    }
    return { type: 'ignored', raw: eventType };
  },

  async refund(credentials, params: RefundParams): Promise<RefundResult> {
    // Scoped by the payment LINK id (gatewayOrderId), not cf_payment_id --
    // see RefundParams' own comment. A payment with no gatewayOrderId on
    // file (shouldn't happen for anything created through this adapter's
    // own createOrder, which always returns one) has nothing to refund.
    if (!params.gatewayOrderId) {
      return { success: false, error: 'No Cashfree payment link id on file for this payment' };
    }
    try {
      const res = await fetch(REFUNDS_URL(params.gatewayOrderId), {
        method: 'POST',
        headers: headers(credentials),
        body: JSON.stringify({ refund_amount: params.amountPaise / 100, refund_id: `refund-${Date.now()}` }),
      });
      const body = (await res.json()) as { cf_refund_id?: string; message?: string };
      if (!res.ok || !body.cf_refund_id) {
        return { success: false, error: body.message ?? 'Cashfree refund failed' };
      }
      return { success: true, gatewayRefundId: body.cf_refund_id };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Cashfree refund request failed' };
    }
  },
};
