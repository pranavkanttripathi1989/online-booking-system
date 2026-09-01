---
id: REQ175
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ004
related: [REQ004, REQ040, REQ008]
---

# Multi-gateway payment registry: Razorpay, Cashfree, PayU, PhonePe, per clinic

## Source

Direct user request: real support for Cashfree/PayU/PhonePe alongside the
existing Razorpay integration, with each clinic able to configure its own
gateway account (a multi-branch org can settle each branch to a different
bank account) — competitor-analysis-informed, since every mid-market Indian
booking SaaS offers a choice of gateway rather than a single fixed vendor.

## Current state (before this requirement)

`backend/src/appointment-payments/` had exactly one gateway (Razorpay), one
platform-wide account (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` env vars), and
a raw `fetch()` call inline in the service — no adapter abstraction, no
per-clinic credentials, no schema for either.

## What this ships

- **`backend/src/payment-gateways/`** — a registry module mirroring
  `NotificationProviderConfig`'s own shape exactly (REQ008): `provider` is a
  plain string key (`razorpay|cashfree|payu|phonepe`), not a Prisma enum, so
  adding a 5th gateway is a code change only. Credentials are one
  AES-256-GCM-encrypted JSON blob column (`PaymentGatewayConfig
  .credentials_encrypted`), never per-field columns, since each vendor needs
  a different credential shape.
- Four adapters (`providers/*.provider.ts`), each implementing one shared
  `PaymentGatewayProvider` interface (`createOrder`, `verifyWebhookSignature`,
  `parseWebhookEvent`, `refund`) — three real integration shapes
  (`razorpay_widget`/`redirect`/`form_post`), not one artificially unified
  call, since the four gateways genuinely check out differently.
- **`PaymentGatewayConfig`** — clinic-scoped (`clinic_id @unique`), not
  org-scoped, per the explicit user choice. A clinic with no configured row
  falls back to the platform's env-var Razorpay credentials — zero
  regression for every existing org.
- `createRazorpayOrder`/`handleRazorpayWebhook` refactored (not rewritten) to
  route through the registry — same URL, same auth-header construction, same
  request/response shape as before, so the existing live-verified Razorpay
  flow and the booking wizard's own contract are unchanged for the default
  case.
- New per-gateway webhook endpoints (`/webhooks/{cashfree,payu,phonepe}`,
  alongside the existing `/webhooks/razorpay`), each `@Public()`. Since each
  clinic now has its own credentials, the correct secret to verify a webhook
  against can't be known before the event is at least parsed — solved by
  parsing (untrusted) to resolve the payment row → resolving THAT payment's
  clinic's own credentials → verifying the signature against those →
  applying the event only once verified. Parsing to route a lookup grants no
  capability by itself; only the subsequent signature check gates trust.
- `settings/index.jsx`'s Clinic Information tab gained a "Payment Gateway"
  section — provider picker + dynamic credential form driven by the
  provider's own server-declared `fields[]`, mirroring
  `admin/Communications.jsx`'s SMS provider card exactly.

## Deliberately NOT built (recorded, not silently dropped)

- **Cashfree/PayU/PhonePe are code-complete and unit-tested, but not
  live-verified.** No real sandbox credentials for those three exist in this
  environment. Each adapter is built strictly from that vendor's own
  published API/signature scheme (Cashfree Payment Links API 2023-08-01,
  PayU's classic hash-and-redirect, PhonePe's X-VERIFY checksum), not
  fabricated — the same honest treatment `msg91.provider.ts` already gives
  its own unverified OTP-SMS integration. Razorpay alone is live-verified,
  since a real sandbox account already works in this environment.
- An online-gateway checkout path for pharmacy purchases (counter payment
  only — see `REQ177`).
- Partial refunds spanning multiple tenders with different per-tender
  amounts — a refund always nets against the total payment (see `REQ176`).

## Acceptance criteria

**US-PAY-01**: As a manager/admin, I can select a payment gateway for my
clinic and enter its credentials, so patient payments settle to the account
I choose.
- Given a clinic with no gateway configured, when I open Settings → Clinic
  Information → Payment Gateway, then I see a provider picker (Razorpay,
  Cashfree, PayU, PhonePe) and no "credentials configured" indicator.
- Given I pick Razorpay and enter valid key_id/key_secret/webhook_secret,
  when I save, then the credentials are encrypted at rest and never shown
  again, and a "Credentials configured" chip appears.
- Given a clinic has no gateway configured at all, when a patient books
  online, then the booking still uses the platform's own Razorpay account —
  no regression for existing orgs.

**US-PAY-02**: As the platform, a gateway's webhook is verified against the
correct clinic's own credentials, never a wrong or platform-wide secret.
- Given clinic A uses Cashfree and clinic B uses Razorpay, when each
  gateway's webhook fires for its own payment, then the correct provider's
  signature check runs against the correct clinic's own decrypted
  credentials, and a forged/tampered payload is rejected before any state
  changes.

## Data model impact

`PaymentGatewayConfig` (new), `AppointmentPayments` gains `gateway`,
`gateway_order_id`, `gateway_payment_id`, `gateway_reference` (all additive;
existing `razorpay_*` columns untouched).
