import * as crypto from 'crypto';
import {
  PlatformBillingProvider,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  CancelSubscriptionParams,
  NormalizedBillingEvent,
} from './provider.interface';

// REQ178/180 — Stripe Billing (card-only, per this feature's own Vendor
// research: Stripe India has no native UPI AutoPay/eNACH). No real
// Stripe test keys exist anywhere in this codebase's environment history
// — shaped strictly against Stripe's own published Billing/Checkout API
// contract, not fabricated, but flagged honestly rather than claimed as
// live-verified, matching this codebase's established convention for an
// unverified integration.
//
// Stripe's REST API is form-encoded (application/x-www-form-urlencoded),
// NOT JSON, on every request -- one of the few well-documented,
// low-ambiguity facts about this vendor even without live credentials,
// so it is not hedged the way the Razorpay Subscriptions field/event
// names above are.
const BASE_URL = 'https://api.stripe.com/v1';

function authHeader(credentials: Record<string, string>) {
  return `Bearer ${credentials.secret_key}`;
}

async function stripePost(credentials: Record<string, string>, path: string, params: Record<string, string>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader(credentials) },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await res.json()) as Record<string, any>;
  return { ok: res.ok, body };
}

export const stripeProvider: PlatformBillingProvider = {
  id: 'stripe',
  label: 'Stripe (card)',
  fields: [
    { key: 'secret_key', label: 'Secret Key', type: 'password', required: true },
    { key: 'webhook_secret', label: 'Webhook Signing Secret', type: 'password', required: true },
  ],

  async createSubscription(credentials, params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    const customerResult = await stripePost(credentials, '/customers', {
      name: params.customerName,
      email: params.customerEmail,
      ...(params.customerPhone ? { phone: params.customerPhone } : {}),
    });
    if (!customerResult.ok || !customerResult.body.id) {
      throw new Error(customerResult.body.error?.message ?? 'Failed to create Stripe customer');
    }
    const customerId = customerResult.body.id as string;

    const priceResult = await stripePost(credentials, '/prices', {
      unit_amount: String(params.amountPaise), // Stripe's smallest INR unit is also paise
      currency: 'inr',
      'recurring[interval]': params.billingPeriod === 'annual' ? 'year' : 'month',
      'product_data[name]': `MediBook subscription (${params.planVersionId})`,
    });
    if (!priceResult.ok || !priceResult.body.id) {
      throw new Error(priceResult.body.error?.message ?? 'Failed to create Stripe price');
    }
    const priceId = priceResult.body.id as string;

    // Checkout Sessions in subscription mode -- the card is entered on
    // Stripe's own hosted page (no PCI scope here), matching this
    // feature's own authenticationUrl shape (the same "customer visits a
    // hosted URL to complete authentication" pattern as Razorpay's
    // short_url).
    const sessionResult = await stripePost(credentials, '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: 'https://app.medibook.dev/admin/platform-billing?stripe_setup=success',
      cancel_url: 'https://app.medibook.dev/admin/platform-billing?stripe_setup=cancelled',
    });
    if (!sessionResult.ok || !sessionResult.body.id) {
      throw new Error(sessionResult.body.error?.message ?? 'Failed to create Stripe Checkout session');
    }

    return {
      gatewayCustomerId: customerId,
      // The real subscription id doesn't exist until checkout completes
      // (customer.subscription.created fires from the webhook) -- the
      // Checkout Session id stands in as the gatewaySubscriptionId until
      // then, updated once the webhook confirms the real one.
      gatewaySubscriptionId: sessionResult.body.id,
      mandateStatus: 'pending',
      authenticationUrl: sessionResult.body.url,
    };
  },

  async cancelSubscription(credentials, params: CancelSubscriptionParams) {
    try {
      const result = params.immediately
        ? await (async () => {
            const res = await fetch(`${BASE_URL}/subscriptions/${params.gatewaySubscriptionId}`, {
              method: 'DELETE',
              headers: { Authorization: authHeader(credentials) },
            });
            const body = (await res.json()) as Record<string, any>;
            return { ok: res.ok, body };
          })()
        : await stripePost(credentials, `/subscriptions/${params.gatewaySubscriptionId}`, { cancel_at_period_end: 'true' });
      if (!result.ok || !result.body.id) {
        return { success: false, error: result.body.error?.message ?? 'Failed to cancel Stripe subscription' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Stripe cancel request failed' };
    }
  },

  // Stripe's own documented scheme: the Stripe-Signature header carries
  // `t=<timestamp>,v1=<hex hmac>`; the signed payload is
  // `${timestamp}.${rawBody}`, HMAC-SHA256 with the webhook signing
  // secret. A 5-minute timestamp tolerance guards against a replayed
  // (genuinely old, previously valid) signature.
  verifyWebhookSignature(credentials, rawBody, headers) {
    const signatureHeader = headers['stripe-signature'];
    if (!signatureHeader || Array.isArray(signatureHeader)) return false;
    const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=') as [string, string]));
    const timestamp = parts.t;
    const v1 = parts.v1;
    if (!timestamp || !v1) return false;
    const toleranceSeconds = 5 * 60;
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > toleranceSeconds) return false;
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSignature = crypto.createHmac('sha256', credentials.webhook_secret).update(signedPayload).digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(v1, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  },

  parseWebhookEvent(rawBody): NormalizedBillingEvent {
    const event = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      created?: number;
      data?: { object?: Record<string, any> };
    };
    const eventType = event.type ?? '';
    const object = event.data?.object ?? {};
    const occurredAt = event.created ? new Date(event.created * 1000) : undefined;

    if (eventType === 'checkout.session.completed') {
      return { type: 'subscription_activated', gatewaySubscriptionId: object.subscription, occurredAt, raw: eventType };
    }
    if (eventType === 'invoice.payment_succeeded') {
      return {
        type: 'charge_succeeded',
        gatewaySubscriptionId: object.subscription,
        gatewayInvoiceId: object.id,
        gatewayPaymentId: object.payment_intent,
        amountPaise: object.amount_paid,
        occurredAt,
        raw: eventType,
      };
    }
    if (eventType === 'invoice.payment_failed') {
      return { type: 'charge_failed', gatewaySubscriptionId: object.subscription, gatewayInvoiceId: object.id, occurredAt, raw: eventType };
    }
    if (eventType === 'customer.subscription.deleted') {
      return { type: 'subscription_cancelled', gatewaySubscriptionId: object.id, occurredAt, raw: eventType };
    }
    return { type: 'ignored', raw: eventType };
  },
};
