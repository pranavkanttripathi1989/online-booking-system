import * as crypto from 'crypto';
import { PaymentGatewayProvider, CreateOrderParams, CreateOrderResult, RefundParams, RefundResult, NormalizedWebhookEvent } from './provider.interface';

// REQ175 — PayU's classic hosted-checkout integration. No real PayU
// sandbox credentials exist in this environment to test an actual
// transaction against — shaped against PayU's published hash-and-redirect
// contract, not fabricated, but flagged honestly rather than claimed as
// live-verified. Re-check the hash field order and API host against PayU's
// current docs the first time real credentials land here.
//
// Unlike Razorpay/Cashfree/PhonePe, PayU's hosted page is reached via a
// browser FORM POST of hash-signed fields, not a GET redirect URL — hence
// this registry's third checkout shape, 'form_post'.
const PAY_URL = 'https://secure.payu.in/_payment';
const REFUND_URL = 'https://info.payu.in/merchant/postservice?form=2';

function sha512(input: string): string {
  return crypto.createHash('sha512').update(input).digest('hex');
}

export const payuProvider: PaymentGatewayProvider = {
  id: 'payu',
  label: 'PayU',
  fields: [
    { key: 'merchant_key', label: 'Merchant Key', type: 'text', required: true },
    { key: 'salt', label: 'Salt', type: 'password', required: true },
  ],

  async createOrder(credentials, params: CreateOrderParams): Promise<CreateOrderResult> {
    const txnid = `${params.receipt}-${Date.now()}`;
    const amount = (params.amountPaise / 100).toFixed(2);
    const productinfo = `Appointment ${params.receipt}`;
    // PayU's documented request hash: key|txnid|amount|productinfo|firstname|email|udf1..5||||||salt
    const firstname = 'Patient';
    const email = 'patient@example.com'; // overwritten by the caller's real form fields before submit; see PLAN's own frontend note
    const hashString = `${credentials.merchant_key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${credentials.salt}`;
    const hash = sha512(hashString);

    return {
      checkoutType: 'form_post',
      gatewayOrderId: txnid,
      formPostUrl: PAY_URL,
      formFields: {
        key: credentials.merchant_key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        hash,
        service_provider: 'payu_paisa',
      },
    };
  },

  // PayU's response/webhook carries a REVERSE hash: salt|status|||||||||||
  // udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key.
  verifyWebhookSignature(credentials, rawBody) {
    let body: Record<string, string>;
    try {
      body = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));
    } catch {
      return false;
    }
    const { status, txnid, amount, productinfo, firstname, email, hash: receivedHash } = body;
    if (!receivedHash) return false;
    const expected = sha512(
      `${credentials.salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${credentials.merchant_key}`,
    );
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(receivedHash);
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  },

  parseWebhookEvent(rawBody): NormalizedWebhookEvent {
    const body = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));
    const status = body.status ?? '';
    if (status === 'success') {
      return { type: 'payment_captured', gatewayOrderId: body.txnid, gatewayPaymentId: body.mihpayid, raw: status };
    }
    if (status === 'failure') {
      return { type: 'payment_failed', gatewayOrderId: body.txnid, gatewayPaymentId: body.mihpayid, raw: status };
    }
    return { type: 'ignored', raw: status };
  },

  async refund(credentials, params: RefundParams): Promise<RefundResult> {
    try {
      const command = 'cancel_refund_transaction';
      const varsHash = sha512(`${credentials.merchant_key}|${command}|${params.gatewayPaymentId}|${credentials.salt}`);
      const res = await fetch(REFUND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          key: credentials.merchant_key,
          command,
          var1: params.gatewayPaymentId,
          var2: `refund-${Date.now()}`,
          var3: (params.amountPaise / 100).toFixed(2),
          hash: varsHash,
        }).toString(),
      });
      const body = (await res.json()) as { status?: number; msg?: string; request_id?: string };
      if (!res.ok || body.status !== 1) {
        return { success: false, error: body.msg ?? 'PayU refund failed' };
      }
      return { success: true, gatewayRefundId: body.request_id ?? `${params.gatewayPaymentId}-refund` };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'PayU refund request failed' };
    }
  },
};
