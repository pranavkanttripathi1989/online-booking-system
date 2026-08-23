---
id: TR070
type: improvement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP071
related: [PLAN044, REQ040]
---

# TR070 — Results: Razorpay webhook, reconciliation job, and order-throttle

All 20 cases in `TP071` pass.

- Unit: 38 new tests across `appointment-payments.service.spec.ts` (webhook
  handling) and `appointment-payments-reconciliation.service.spec.ts` (new
  file) — all green. Full backend suite: **708/708 tests, 55 suites**,
  59.8s. `tsc --noEmit` and `eslint` clean on every touched file.
- Live, against the real running dev backend (not just mocks):
  - Inserted a real `pending` `AppointmentPayments` row with a known
    `razorpay_order_id` directly via `psql`.
  - Computed a genuine HMAC-SHA256 signature over the exact JSON body using
    the configured `RAZORPAY_WEBHOOK_SECRET`, POSTed it to
    `/webhooks/razorpay` with an `X-Razorpay-Signature` header — response
    `{"acknowledged":true}`, HTTP 200.
  - Confirmed via `psql`: the row's `status` flipped `pending` → `succeeded`
    and `razorpay_payment_id` was set from the payload; a matching
    `AuditLogs` row (`action: razorpay_webhook`, `outcome: success`) exists.
  - Confirmed an invalid signature is rejected (400) before touching the
    database, and an unconfigured secret is rejected the same way.
  - Confirmed the throttle: 12 sequential `curl` calls to
    `createRazorpayOrder` immediately after a clean container restart
    (guaranteeing a known in-memory counter state) — exactly the first 10
    succeeded (reaching the real "Appointment not found" business-logic
    error, proving they weren't rejected earlier), the 11th and 12th
    returned `ThrottlerException: Too Many Requests`.
  - Test data cleaned up afterward (`DELETE` on the inserted payment row and
    the audit rows this verification pass generated).

## A real discrepancy found during this verification, not assumed from a comment

`account.controller.ts`'s own header comment claims "the global GqlAuthGuard
reads exclusively from GraphQL execution context... so it can't protect a
REST route correctly." Live-tested this directly rather than trusting it:
`POST /account/avatar` and `POST /org-branding/logo` **both** return a real
`401 Unauthorized` when called with no `Authorization` header, and reach
their own controller logic once a valid bearer token is presented — the
global guard chain does gate REST routes, just not perfectly (subsequent
investigation wasn't needed for this slice, since the fix either way is
`@Public()`, which is unaffected by which failure mode is technically
happening). This meant the webhook controller initially returned a bare
`401` before its own logic ever ran, until `@Public()` was added to match —
logged here since a plausible-sounding pre-existing code comment turned out
to be an incomplete description of the guard's actual behavior, not
something to keep assuming uncritically on the next REST controller.

## What this does not close

- Refund/dispute webhook events are acknowledged and ignored, not handled —
  no refund flow exists anywhere in this codebase yet (`REQ040`).
- No GST invoice is generated on webhook-confirmed payment — no invoicing
  module exists.
- `createRazorpayOrder`/`verifyRazorpayPayment` remain unauthenticated by
  design (anonymous booking); the fix here is a rate limit, not an identity
  check — see `REQ040`/`PLAN044` for the reasoning.
