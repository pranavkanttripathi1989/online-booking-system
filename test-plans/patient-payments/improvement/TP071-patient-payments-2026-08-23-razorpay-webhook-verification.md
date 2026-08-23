---
id: TP071
type: improvement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ040
related: [PLAN044, TR070]
---

# TP071 — Verification for the Razorpay webhook, reconciliation job, and order-throttle

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Webhook: `RAZORPAY_WEBHOOK_SECRET` unset | Rejected (400), audit row `not_configured`, no DB read |
| TC-02 | Webhook: missing signature header | Rejected (400), audit row `missing_signature` |
| TC-03 | Webhook: tampered/incorrect signature | Rejected (400), audit row `invalid_signature`, no payment lookup |
| TC-04 | Webhook: unparseable body (even with a signature matching those exact bytes) | Rejected (400) |
| TC-05 | Webhook: an event type this codebase doesn't act on (e.g. `refund.processed`) | Acknowledged (200), audit row `ignored`, no DB write |
| TC-06 | Webhook: `payment.captured` for an order with no matching `AppointmentPayments` row | Acknowledged (200), no update attempted |
| TC-07 | Webhook: `payment.captured` for a real pending row | Row → `succeeded`, `razorpay_payment_id` set from the payload |
| TC-08 | Webhook: `payment.captured` delivered twice for the same order (Razorpay's at-least-once retry) | Second delivery is a no-op — idempotent by construction |
| TC-09 | Webhook: `payment.failed` for a pending row | Row → `failed` |
| TC-10 | Webhook: `payment.failed` arriving after the row is already `succeeded` | No regression — row stays `succeeded` |
| TC-11 | Reconciliation: no stale pending rows | No Razorpay API call made |
| TC-12 | Reconciliation: Razorpay not configured | Sweep skipped entirely, not per-row failures |
| TC-13 | Reconciliation: a stale row whose order has a captured payment | Row → `succeeded` |
| TC-14 | Reconciliation: a stale row whose order has no captured payment | Row → `failed` |
| TC-15 | Reconciliation: the Razorpay API call itself errors | Row left untouched (inconclusive ≠ failed), audit row `error` |
| TC-16 | Reconciliation: one row's fetch fails, a second row's succeeds in the same sweep | Each reconciled independently — one failure doesn't block the other |
| TC-17 | `createRazorpayOrder`/`verifyRazorpayPayment` remain callable without authentication | Anonymous booking flow (`booking/index.jsx`) still works — no auth requirement added |
| TC-18 | `createRazorpayOrder` throttle | 11th call within 60s from the same caller is rejected (`ThrottlerException`), first 10 succeed |
| TC-19 | Full backend suite + `tsc --noEmit` + `eslint` | All clean |
| TC-20 | Live: real HMAC-signed webhook call against the running dev backend | Payment row provably flips `pending` → `succeeded`, audit row recorded |

## How this was checked

TC-01–10 via Jest unit tests against `AppointmentPaymentsService.handleRazorpayWebhook()` with a mocked `PrismaService` (`appointment-payments.service.spec.ts`). TC-11–16 via Jest unit tests against `AppointmentPaymentsReconciliationService` with a mocked `fetch` and `PrismaService` (`appointment-payments-reconciliation.service.spec.ts`). TC-17 confirmed by code inspection — `@Public()` was deliberately kept, not removed. TC-18 via 12 sequential live `curl` calls against the running dev backend immediately after a clean restart (to guarantee a known in-memory throttle-counter state), confirming exactly 10 succeed and the 11th throttles. TC-19 via the backend container's own `npx jest --maxWorkers=2`, `npx tsc --noEmit`, `npx eslint`. TC-20 via a real database row inserted with a known `razorpay_order_id`, a genuinely computed HMAC-SHA256 signature over the exact request body, and a live `curl` POST to `/webhooks/razorpay` — confirmed the row's `status`/`razorpay_payment_id` and the `AuditLogs` row directly via `psql`, then cleaned up both.
