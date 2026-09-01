// REQ175 — one file per payment gateway, each conforming to this shape.
// Mirrors backend/src/notifications/providers/provider.interface.ts's own
// pattern exactly (REQ008): adding a 5th gateway means one new file here
// plus one line in registry.ts, no schema change, no resolver change.

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
}

export interface CreateOrderParams {
  amountPaise: number;
  receipt: string; // appointment id, used as the gateway-side order reference
}

// Three real integration shapes, not one artificially unified call — the
// four gateways genuinely check out differently. Razorpay opens a JS
// widget client-side; Cashfree/PhonePe issue a hosted-page URL to redirect
// to; PayU's classic integration is a hash-signed HTML form POST to their
// hosted page. Forcing all four through one shape would misrepresent how
// any of them actually work.
export type CheckoutType = 'razorpay_widget' | 'redirect' | 'form_post';

export interface CreateOrderResult {
  checkoutType: CheckoutType;
  gatewayOrderId: string;
  razorpayKeyId?: string; // razorpay_widget only
  redirectUrl?: string; // redirect only
  formPostUrl?: string; // form_post only
  formFields?: Record<string, string>; // form_post only
}

export interface RefundParams {
  gatewayPaymentId: string;
  // Cashfree's refund endpoint is scoped by its own Payment LINK id
  // (/pg/links/{link_id}/refunds), not the captured cf_payment_id -- a
  // genuinely different id than what Razorpay/PayU/PhonePe's own refund
  // APIs key off. Optional so the other three providers can ignore it.
  gatewayOrderId?: string;
  amountPaise: number;
}

export interface RefundResult {
  success: boolean;
  gatewayRefundId?: string;
  error?: string;
}

export type NormalizedWebhookEventType = 'payment_captured' | 'payment_failed' | 'refund_processed' | 'refund_failed' | 'ignored';

export interface NormalizedWebhookEvent {
  type: NormalizedWebhookEventType;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewayRefundId?: string;
  raw: string; // event name as the vendor spelled it, for audit logging
}

export interface PaymentGatewayProvider {
  id: string;
  label: string;
  fields: ProviderField[];
  createOrder(credentials: Record<string, string>, params: CreateOrderParams): Promise<CreateOrderResult>;
  // Verifies against the EXACT raw bytes the gateway signed — never a
  // re-serialized parse (key order/whitespace differences break an HMAC
  // even for a genuine delivery), matching handleRazorpayWebhook's own
  // established rule in appointment-payments.service.ts.
  verifyWebhookSignature(credentials: Record<string, string>, rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhookEvent(rawBody: Buffer): NormalizedWebhookEvent;
  refund(credentials: Record<string, string>, params: RefundParams): Promise<RefundResult>;
}

export function validateCredentials(provider: PaymentGatewayProvider, credentials: Record<string, string>): string | null {
  for (const field of provider.fields) {
    if (field.required && !credentials[field.key]) {
      return `Missing required field "${field.label}" for ${provider.label}`;
    }
  }
  return null;
}
