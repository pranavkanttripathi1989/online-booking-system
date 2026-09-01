---
id: TP264
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: approved
parent: PLAN244
related: [REQ175]
---

# TP264 — Test plan: multi-gateway payment registry

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped module against an already-proven registry pattern
(`REQ008`'s `NotificationProviderConfig`).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `paymentGatewayProviders` | Lists all 4 gateways with correct field shapes |
| 2 | `myClinicConfig` — cross-org clinic | Returns `null`, never confirms existence |
| 3 | `myClinicConfig` — nothing configured | `{has_credentials: false, is_active: false}` |
| 4 | `myClinicConfig` — configured | `has_credentials: true`; raw credentials never in the response |
| 5 | `updateConfig` — cross-org clinic | Rejected, no write |
| 6 | `updateConfig` — unknown provider id | Rejected |
| 7 | `updateConfig` — missing required field | Rejected, no write |
| 8 | `updateConfig` — real save | Encrypted at rest; `client_org_id` stamped from the clinic, not the caller |
| 9 | `updateConfig` — empty credentials, existing row | Keeps existing encrypted blob |
| 10 | `updateConfig` — empty credentials, no existing row | Rejected |
| 11 | `getActiveConfigForClinic` — no row | Falls back to env-var Razorpay |
| 12 | `getActiveConfigForClinic` — inactive row | Falls back to env-var Razorpay |
| 13 | `getActiveConfigForClinic` — active row | Decrypts and returns the clinic's own config |
| 14 | Razorpay `verifyWebhookSignature` | Accepts a genuine HMAC, rejects wrong secret/tampered body/missing header |
| 15 | Razorpay `parseWebhookEvent` | Correct mapping for `payment.captured`/`refund.processed`/unrecognised |
| 16 | Razorpay `createOrder`/`refund` | Correct request shape, error surfaced not thrown on gateway failure |
| 17 | Cashfree/PayU/PhonePe — same shape as 14-16 | Hand-derived signature fixtures for each vendor's own scheme |
| 18 | Cashfree `refund` | Scoped by `gatewayOrderId` (link id), not `gatewayPaymentId`; fails cleanly with neither |
| 19 | Multi-gateway webhook verification | Parses to resolve the payment's clinic, verifies against THAT clinic's own credentials |
| 20 | `settings/index.jsx` | Provider picker + dynamic credential form; "Credentials configured" chip; save round-trips |
