import * as crypto from 'crypto';
import {
  PlatformBillingProvider,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  CancelSubscriptionParams,
  NormalizedBillingEvent,
} from './provider.interface';

// REQ178/180 — Razorpay's Subscriptions product (plan + subscription
// objects, distinct from the Orders API this codebase's own per-clinic
// patient-payment Razorpay adapter uses). No real Razorpay Subscriptions-
// product test credentials exist in this environment to verify an actual
// customer/plan/subscription/webhook round trip against — shaped
// strictly against Razorpay's own published Subscriptions API contract,
// not fabricated, but flagged honestly rather than claimed as
// live-verified. This is the SAME honesty convention this codebase
// already applies to msg91.provider.ts and the Cashfree/PayU/PhonePe
// patient-payment adapters (REQ175) — re-check every endpoint path and
// field name against Razorpay's current docs the first time real
// credentials land here.
//
// Real RBI e-mandate flow this adapter relies on Razorpay to implement
// itself (not re-derived here): the customer authenticates the mandate
// once at the hosted `short_url` (UPI PIN, eNACH bank auth, or 3DS for a
// card, the customer's own choice at Razorpay's checkout); Razorpay
// itself sends the mandatory 24h pre-debit notice on its own schedule
// once a subscription is active; AFA (UPI PIN re-entry) is required by
// Razorpay above ₹15,000 per charge, again enforced by Razorpay's own
// infrastructure, not by this codebase.
const BASE_URL = 'https://api.razorpay.com/v1';

function authHeader(credentials: Record<string, string>) {
  return `Basic ${Buffer.from(`${credentials.key_id}:${credentials.key_secret}`).toString('base64')}`;
}

// Razorpay's Subscriptions API requires a Razorpay-side "Plan" object
// (period/interval/item) before a Subscription can reference it —
// distinct from this codebase's own Plans/PlanVersions catalog. Created
// on demand, keyed by planVersionId in the plan's own notes field so a
// re-subscribe to the same PlanVersion could in principle reuse it (not
// implemented here — creating a fresh Razorpay plan per subscription is
// simpler and correct, just not maximally efficient; Razorpay plans are
// free to create).
async function createRazorpayPlan(credentials: Record<string, string>, params: CreateSubscriptionParams): Promise<string> {
  const res = await fetch(`${BASE_URL}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(credentials) },
    body: JSON.stringify({
      period: params.billingPeriod === 'annual' ? 'yearly' : 'monthly',
      interval: 1,
      item: { name: `MediBook subscription (${params.planVersionId})`, amount: params.amountPaise, currency: 'INR' },
      notes: { plan_version_id: params.planVersionId },
    }),
  });
  const body = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !body.id) {
    throw new Error(body.error?.description ?? 'Failed to create Razorpay plan');
  }
  return body.id;
}

export const razorpaySubscriptionsProvider: PlatformBillingProvider = {
  id: 'razorpay',
  label: 'Razorpay (UPI AutoPay / eNACH)',
  fields: [
    { key: 'key_id', label: 'Key ID', type: 'text', required: true },
    { key: 'key_secret', label: 'Key Secret', type: 'password', required: true },
    { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: true },
  ],

  async createSubscription(credentials, params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    const razorpayPlanId = await createRazorpayPlan(credentials, params);

    // total_count: 120 monthly / 10 annual cycles ~= 10 years, matching
    // how a real "until cancelled" subscription is modeled on an API
    // that requires a finite cycle count — cancelPlatformSubscription()
    // is the real end-of-subscription path, not running out of cycles.
    const totalCount = params.billingPeriod === 'annual' ? 10 : 120;
    const res = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(credentials) },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: { mandate_max_amount_paise: params.mandateMaxAmountPaise },
      }),
    });
    const body = (await res.json()) as { id?: string; short_url?: string; error?: { description?: string } };
    if (!res.ok || !body.id) {
      throw new Error(body.error?.description ?? 'Failed to create Razorpay subscription');
    }
    return {
      // Razorpay's Subscriptions API creates the customer implicitly from
      // the subscription's own checkout flow rather than a separate
      // up-front customer_id in this shape -- gatewayCustomerId is left
      // as the subscription id itself pending the real customer_id
      // Razorpay assigns, updated from the subscription.activated
      // webhook payload once real credentials confirm its exact field
      // name.
      gatewayCustomerId: body.id,
      gatewaySubscriptionId: body.id,
      mandateStatus: 'pending',
      authenticationUrl: body.short_url,
    };
  },

  async cancelSubscription(credentials, params: CancelSubscriptionParams) {
    try {
      const res = await fetch(`${BASE_URL}/subscriptions/${params.gatewaySubscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader(credentials) },
        body: JSON.stringify({ cancel_at_cycle_end: params.immediately ? 0 : 1 }),
      });
      const body = (await res.json()) as { id?: string; error?: { description?: string } };
      if (!res.ok || !body.id) {
        return { success: false, error: body.error?.description ?? 'Failed to cancel Razorpay subscription' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Razorpay cancel request failed' };
    }
  },

  // Same HMAC-SHA256-over-raw-bytes scheme as this codebase's own
  // existing, live-verified Razorpay Orders webhook
  // (appointment-payments.service.ts#handleRazorpayWebhook) -- Razorpay
  // uses one signature scheme across its whole webhook system, so this
  // part is NOT a guess, unlike the Subscriptions-API-specific request
  // shapes above.
  verifyWebhookSignature(credentials, rawBody, headers) {
    const signatureHeader = headers['x-razorpay-signature'];
    if (!signatureHeader || Array.isArray(signatureHeader)) return false;
    const expectedSignature = crypto.createHmac('sha256', credentials.webhook_secret).update(rawBody).digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signatureHeader, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  },

  parseWebhookEvent(rawBody): NormalizedBillingEvent {
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: {
        subscription?: { entity?: { id?: string } };
        payment?: { entity?: { id?: string; amount?: number } };
        invoice?: { entity?: { id?: string } };
      };
      created_at?: number;
    };
    const eventType = event.event ?? '';
    const subscriptionId = event.payload?.subscription?.entity?.id;
    const paymentId = event.payload?.payment?.entity?.id;
    const invoiceId = event.payload?.invoice?.entity?.id;
    const amountPaise = event.payload?.payment?.entity?.amount;
    const occurredAt = event.created_at ? new Date(event.created_at * 1000) : undefined;

    if (eventType === 'subscription.activated' || eventType === 'subscription.authenticated') {
      return { type: 'subscription_activated', gatewaySubscriptionId: subscriptionId, occurredAt, raw: eventType };
    }
    if (eventType === 'subscription.charged') {
      return { type: 'charge_succeeded', gatewaySubscriptionId: subscriptionId, gatewayPaymentId: paymentId, gatewayInvoiceId: invoiceId, amountPaise, occurredAt, raw: eventType };
    }
    if (eventType === 'payment.failed' || eventType === 'subscription.halted') {
      return { type: 'charge_failed', gatewaySubscriptionId: subscriptionId, gatewayPaymentId: paymentId, occurredAt, raw: eventType };
    }
    // Razorpay's own pre-debit notice event for UPI AutoPay/eNACH mandates
    // -- exact event name not confirmed against live docs; re-verify
    // ('subscription.pending' is Razorpay's documented "about to charge,
    // notice window open" state for recurring mandates as of this
    // codebase's own research).
    if (eventType === 'subscription.pending') {
      return { type: 'pre_debit_notice_sent', gatewaySubscriptionId: subscriptionId, amountPaise, occurredAt, raw: eventType };
    }
    if (eventType === 'subscription.paused') {
      return { type: 'mandate_paused', gatewaySubscriptionId: subscriptionId, occurredAt, raw: eventType };
    }
    if (eventType === 'subscription.cancelled') {
      return { type: 'subscription_cancelled', gatewaySubscriptionId: subscriptionId, occurredAt, raw: eventType };
    }
    return { type: 'ignored', raw: eventType };
  },
};
