---
id: PLAN244
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ175
related: [TP264, TR264]
---

# PLAN244 — Implementation plan: multi-gateway payment registry

## Schema (`20260902010000_payment_gateways_refunds`)

```prisma
model PaymentGatewayConfig {
  id                     String   @id @default(uuid())
  clinic_id              String   @unique
  client_org_id          String?
  provider               String
  credentials_encrypted  String
  is_active              Boolean  @default(true)
  created_at             DateTime @default(now())
  updated_at             DateTime @default(now())
  clinic     Clinics              @relation(fields: [clinic_id], references: [id])
  client_org ClientOrganizations? @relation(fields: [client_org_id], references: [id])
}
```

`AppointmentPayments` gains (additive, existing `razorpay_*` columns
untouched): `gateway String @default("razorpay")`, `gateway_order_id`,
`gateway_payment_id`, `gateway_reference` (all `String?`), plus the refund
fields listed in PLAN245. Index on `gateway_order_id` for the webhook
lookup path.

## `backend/src/payment-gateways/` (new module)

- `providers/provider.interface.ts` — `PaymentGatewayProvider`,
  `CreateOrderResult` (`checkoutType: 'razorpay_widget'|'redirect'|
  'form_post'`), `RefundParams`/`RefundResult`, `NormalizedWebhookEvent`
  (`type: 'payment_captured'|'payment_failed'|'refund_processed'|
  'refund_failed'|'ignored'`), `validateCredentials()`.
- `providers/razorpay.provider.ts` — extracted verbatim from
  `appointment-payments.service.ts`'s pre-existing inline `fetch()` calls;
  same `ORDERS_URL`, same `Basic` auth header, same request/response
  shape. Behaviour-preserving by construction.
- `providers/cashfree.provider.ts` — Payment Links API (`POST /pg/links`,
  `x-api-version: 2023-08-01`), webhook = `base64(HMAC-SHA256(timestamp +
  rawBody, client_secret))` against `x-webhook-signature`/
  `x-webhook-timestamp`. Refund is scoped by the link's own `link_id`
  (`gatewayOrderId`), not `cf_payment_id` — see "real bugs found" below.
- `providers/payu.provider.ts` — classic hash-signed form POST
  (`checkoutType: 'form_post'`), SHA-512 over
  `key|txnid|amount|productinfo|firstname|email|udf1..5||||||salt`; inbound
  verification is the documented reverse hash.
- `providers/phonepe.provider.ts` — `X-VERIFY = SHA256(base64Payload +
  path + saltKey) + "###" + saltIndex`, same scheme for pay request and
  callback verification.
- `providers/registry.ts` — `PROVIDERS: Record<string, PaymentGatewayProvider>`,
  `getProvider(id)`/`listProviders()`. The map is the factory, no `switch`.
- `payment-gateway-config.service.ts` — `providers()`, `myClinicConfig()`
  (`has_credentials` boolean only, matches
  `NotificationProviderConfigService`'s own write-only-secret contract),
  `updateConfig()` (empty-credentials-payload keeps the existing encrypted
  blob), `getActiveConfigForClinic()` (internal — decrypts the clinic's
  own row if active, else falls back to env-var Razorpay).
- `payment-gateway-config.resolver.ts` — `paymentGatewayProviders` (no
  `@Auth`, global guard already requires auth), `clinicPaymentGatewayConfig`/
  `updatePaymentGatewayConfig` (`@Auth('manager','admin','super_admin')`).

## `appointment-payments.service.ts` changes

- `createRazorpayOrder()` now resolves `{provider, credentials}` via
  `paymentGatewayConfig.getActiveConfigForClinic()`, calls
  `provider.createOrder()`, dual-writes legacy `razorpay_order_id` (only
  when `provider.id === 'razorpay'`) and the new generic
  `gateway`/`gateway_order_id` fields. Response extended with
  `gateway`/`checkout_type`/`redirect_url`/`form_post_url`/`form_fields` —
  additive to `RazorpayOrderResultType`, existing frontend contract
  unchanged for the default (unconfigured clinic, Razorpay) case.
- New `verifyAndApplyGatewayEvent(gateway, rawBody, headers)` — parses the
  event (untrusted) to resolve the payment row → resolves THAT payment's
  clinic's own credentials → verifies the signature against those → only
  then applies via `applyGatewayEvent()`. Solves the "can't know which
  secret to verify against before parsing" problem this session's own
  research surfaced (a real design gap Razorpay's single platform-wide
  secret never had to solve).
- New `GatewayWebhooksController`
  (`appointment-payments/gateway-webhooks.controller.ts`) —
  `@Public() POST /webhooks/{cashfree,payu,phonepe}`, each calling
  `verifyAndApplyGatewayEvent`.

## `settings/index.jsx`

New "Payment Gateway" section on the Clinic Information tab —
`GET_PAYMENT_GATEWAY_PROVIDERS`/`GET_CLINIC_PAYMENT_GATEWAY_CONFIG`/
`UPDATE_PAYMENT_GATEWAY_CONFIG`, provider `Select` + dynamic credential
form driven by the server's own `fields[]`, mirroring
`admin/Communications.jsx`'s SMS provider card exactly (including the
"Credentials configured" chip and the placeholder-on-existing-secret UX).

## Real bugs found while building this

Cashfree's refund endpoint (`/pg/links/{link_id}/refunds`) is scoped by
the payment LINK id, not the captured `cf_payment_id` — my own first draft
conflated the two, since `RefundParams` originally only carried
`gatewayPaymentId`. Found while writing `cashfree.provider.spec.ts`'s own
refund test, before it ever reached a live account. Fixed by widening
`RefundParams` with an optional `gatewayOrderId`, updating
`decideRefundRequest`'s call site to pass both, and adding a "fails
cleanly with no gatewayOrderId, calling no gateway" test.

## Live verification (Razorpay path + the registry itself)

Against the real dev stack (`manager@medibook.dev`, real JWT): 4/4
providers confirmed served with correct field shapes;
`updatePaymentGatewayConfig` on a real clinic (Cashfree, fake test
credentials) round-tripped through `clinicPaymentGatewayConfig` correctly
(`has_credentials: true`, provider echoed back); a direct `psql` check
confirmed the stored `credentials_encrypted` column is genuinely
ciphertext (152 bytes, no plaintext credential substring). Test row
deleted afterward — no residue. Cashfree/PayU/PhonePe's own gateway APIs
remain unverified against real sandboxes (no credentials exist in this
environment) — unit-tested against hand-derived signature fixtures only,
stated honestly in `TR264`.
