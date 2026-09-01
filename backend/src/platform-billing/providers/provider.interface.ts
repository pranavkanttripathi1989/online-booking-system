// REQ178/180 — one file per platform-billing gateway, mirroring
// payment-gateways/providers/provider.interface.ts's own established
// pattern (add a gateway = one new file + one registry.ts line). A
// genuinely SEPARATE registry from that one, deliberately: that one is
// per-clinic, patient-payment, one-shot order/refund shaped; this one is
// platform-level (ONE account per gateway, from env vars, never
// per-tenant), subscription/mandate-lifecycle shaped, not order/refund
// shaped.

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
}

export interface CreateSubscriptionParams {
  planVersionId: string;
  amountPaise: number;
  billingPeriod: 'monthly' | 'annual';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  // Razorpay's UPI AutoPay mandate has a real per-cycle ceiling (RBI's
  // own AFA threshold, ₹15,000, unless the plan is priced above it — see
  // Vendor research in the plan doc); Stripe (card, no mandate ceiling
  // concept) ignores this field entirely.
  mandateMaxAmountPaise: number;
}

export interface CreateSubscriptionResult {
  gatewayCustomerId: string;
  gatewaySubscriptionId: string;
  // pending until the tenant completes the one-time mandate
  // authentication (UPI PIN / eNACH bank auth / card 3DS) — never
  // 'confirmed' at creation time, matching how a real mandate actually
  // works (see Vendor research: UPI confirms in real time once the
  // TENANT acts, not the platform).
  mandateStatus: 'pending';
  // Where the tenant completes that one-time authentication.
  authenticationUrl?: string;
}

export interface CancelSubscriptionParams {
  gatewaySubscriptionId: string;
  // Razorpay/Stripe both support "let the current period finish, then
  // stop" vs "stop right now" -- the RBI mandate-cancel-rights language
  // (Vendor research) is explicitly about the TENANT'S OWN right to
  // revoke at any time, not a constraint on how the platform itself
  // cancels.
  immediately: boolean;
}

export type NormalizedBillingEventType =
  | 'subscription_activated' // mandate authentication completed
  | 'charge_succeeded'
  | 'charge_failed'
  | 'pre_debit_notice_sent' // Razorpay's own RBI-mandated 24h notice, fired by Razorpay itself, not computed by this codebase
  | 'mandate_paused'
  | 'mandate_revoked'
  | 'subscription_cancelled'
  | 'ignored';

export interface NormalizedBillingEvent {
  type: NormalizedBillingEventType;
  gatewaySubscriptionId?: string;
  gatewayPaymentId?: string;
  gatewayInvoiceId?: string;
  amountPaise?: number;
  occurredAt?: Date;
  raw: string; // event name as the vendor spelled it, for audit logging
}

export interface PlatformBillingProvider {
  id: string;
  label: string;
  fields: ProviderField[];
  createSubscription(credentials: Record<string, string>, params: CreateSubscriptionParams): Promise<CreateSubscriptionResult>;
  cancelSubscription(credentials: Record<string, string>, params: CancelSubscriptionParams): Promise<{ success: boolean; error?: string }>;
  // Verifies against the EXACT raw bytes the gateway signed — never a
  // re-serialized parse (key order/whitespace differences break an HMAC
  // even for a genuine delivery), matching this codebase's own
  // established rule (handleRazorpayWebhook, payment-gateways' own
  // provider.interface.ts).
  verifyWebhookSignature(credentials: Record<string, string>, rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhookEvent(rawBody: Buffer): NormalizedBillingEvent;
}

export function validateCredentials(provider: PlatformBillingProvider, credentials: Record<string, string>): string | null {
  for (const field of provider.fields) {
    if (field.required && !credentials[field.key]) {
      return `Missing required field "${field.label}" for ${provider.label}`;
    }
  }
  return null;
}
