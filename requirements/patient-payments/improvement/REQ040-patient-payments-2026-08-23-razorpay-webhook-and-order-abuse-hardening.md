---
id: REQ040
type: improvement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ004
related: [REQ023]
---

# REQ040 — Razorpay webhook, pending-payment reconciliation, and order-creation abuse hardening

Closes `project-plans/06-execution-plan.md` P3.5 and the full scope of
`project-plans/02-findings-register.md` F-07 — the execution plan's own P3.5
row only names the webhook half; F-07's actual text also flags that
`createRazorpayOrder`/`verifyRazorpayPayment` are both `@Public()` with no
rate limit, letting anyone who learns an appointment UUID generate unbounded
real Razorpay order objects. Both halves are in scope here; skipping the
second because the phase-plan row didn't repeat it would be exactly the kind
of "skipped step" Hard Rule 1 warns against.

## Current state

`backend/src/appointment-payments/appointment-payments.service.ts`:
`createRazorpayOrder` creates a real vendor order + a `pending`
`AppointmentPayments` row from a bare `appointmentId`, no auth, no rate
limit. `verifyRazorpayPayment` recomputes Razorpay's client-integration HMAC
and flips the row to `succeeded`/`failed` — correct when it runs, but it
only ever runs if the client's own browser calls it after checkout. If the
browser is closed, crashes, or loses network between a successful Razorpay
charge and this callback, the row stays `pending` forever and the org has
no way to know the patient was actually charged. There is no
server-to-server webhook and no REST controller anywhere in the backend
handles payment provider callbacks (confirmed: only `account` and
`org-branding` have `@Controller()`s).

## Why `createRazorpayOrder` cannot simply require authentication

F-07's suggested fix ("require authentication... check the caller is the
appointment's patient or org staff") does not fit this codebase's actual,
deliberate architecture: `frontend/src/pages/booking/index.jsx` — the public
booking wizard, fixed to work anonymously in this session's own `BUG011` —
calls `createRazorpayOrder` before the visitor has ever authenticated. Full
auth-gating would break a flow this session specifically un-broke. The
abuse surface (unbounded real vendor orders, reconciliation noise) is real
regardless — the fix here is a per-appointment rate limit plus a state
check, not an auth requirement that contradicts the anonymous-booking
decision already made.

## User stories

**US-1**: As a platform operator, I need a payment whose checkout succeeded
but whose confirmation callback never arrived to still end up `succeeded` in
our own records, so that org staff aren't chasing "the patient says they
paid but the system shows pending" support tickets.

- Given: a Razorpay order is created and the patient completes checkout in
  Razorpay's widget, capturing the payment on Razorpay's side
- When: the patient's browser never calls `verifyRazorpayPayment` (closed
  tab, crash, lost connection)
- Then: Razorpay's own webhook delivery reaches a real, signature-verified
  endpoint on this backend, and the corresponding `AppointmentPayments` row
  is updated to `succeeded` without any client action

**US-2**: As the same operator, for the rarer case where even the webhook
delivery is lost (Razorpay retries webhooks, but not indefinitely), I need a
periodic sweep that reconciles any `pending` row old enough that it's no
longer a live checkout session.

- Given: an `AppointmentPayments` row has been `pending` for longer than a
  live Razorpay checkout session could plausibly still be open
- When: the reconciliation job runs
- Then: it queries Razorpay's own Payments API for that order and updates
  the row to match reality (`succeeded`/`failed`), rather than leaving it
  `pending` indefinitely

**US-3**: As a platform operator, I need `createRazorpayOrder` to not be a
free unbounded-order-generation abuse vector, without breaking the
anonymous public booking flow that legitimately needs to call it
unauthenticated.

- Given: an anonymous visitor (or a script) repeatedly calls
  `createRazorpayOrder` against the same or many appointment ids
- When: the request rate exceeds a reasonable per-appointment/per-IP bound
- Then: the request is rejected with a clean, existing-pattern throttle
  error, not silently allowed to keep minting real vendor order objects

## FR traceability

- `FR-BILLING-*` (payments) — CareOS PRD's payment-integrity expectations;
  no PRD `FR-*` ID directly names webhook reconciliation, so this traces to
  the pre-existing `project-plans` audit finding `F-07` instead, per that
  finding's own `File as: bug, feature patient-payments` instruction.

## Data model impact

None. `AppointmentPayments` already has `razorpay_order_id`,
`razorpay_payment_id`, `razorpay_signature`, and a `metadata Json` column —
sufficient for both the webhook and the reconciliation job without a schema
change. A new environment variable, `RAZORPAY_WEBHOOK_SECRET`, is required
(distinct from `RAZORPAY_KEY_SECRET`, which signs the client-integration
checksum, not webhook deliveries — using the same secret for both would be
wrong even though both are HMAC-SHA256).

## Out of scope, logged rather than guessed at

- GST invoice generation on webhook-confirmed payments — no invoicing
  module exists yet (separate, larger scope, not this slice).
- Refund webhook events (`refund.processed` etc.) — no refund flow exists
  anywhere in this codebase yet; handling only `payment.captured` and
  `payment.failed` is a deliberate, narrower scope matching what actually
  exists today.
