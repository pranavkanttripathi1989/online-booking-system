---
id: REQ176
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ004
related: [REQ175, REQ056, REQ006]
---

# Refund engine: cancellation/reschedule fee policy + manager approval queue

## Source

Direct user request: "I can setup refund on the basis of advance cancellation
or rescheduling amount extra" — a refund amount driven by how far in advance
a cancellation/reschedule happens, with real refund processing through the
patient's own payment gateway.

## Current state (before this requirement)

Confirmed via full-repo grep: **no refund mutation, no refund schema
anywhere.** `handleRazorpayWebhook`'s own prior comment admitted it plainly:
"refunds/disputes have no schema anywhere in this codebase yet... silently
accepting and ignoring them is the honest behavior." `ProductCancellationRules`
(`REQ006`) existed as real admin CRUD (`hours_before_appointment`, `fee_type:
fixed|percentage`, `fee_amount`, `clinic_id?`, `product_id?`, `priority`) but
was never read outside its own module — `cancelAppointment` only flipped
status, never computed a fee.

## What this ships

- **`common/scheduling/cancellation-fee.ts`** — pure functions
  (`selectApplicableRule`, `computeCancellationFee`, `hoursBetween`), unit-
  tested in isolation. Rule priority: product+clinic beats clinic-only beats
  product-only beats org-wide (no product, no clinic), then the rule's own
  `priority` field. No matching rule → `appliedRule: null`, treated as "no
  policy configured" (full refund/no fee), never a hidden 100% default.
- **`ProductCancellationRules.product_id`/`rule_type`** — both existed
  schema-only (`rule_type` had a real `RuleType` enum since `REQ006`, never
  exposed on the create/update DTO; `product_id` was documented as "a
  not-yet-built per-service-rule feature"). Closed the same pass this was
  discovered, directly matching the user's own mid-turn follow-up
  ("cancellation fees on the basis of service, percentage/fixed amount...
  same for rescheduling") — reused the existing table with a `rule_type`
  filter rather than building a duplicate `ProductRescheduleRules` table (a
  deliberate, better-fit deviation from the originally-approved plan).
- **`RefundRequests`** — mirrors `DiscountApprovalRequests` (`REQ056`)
  field-for-field: `requestRefund()` computes `requested_amount` entirely
  server-side via the fee policy engine, never from client input.
  `decideRefundRequest()` mirrors `decideDiscountApproval()`'s own rule
  exactly — the requester can never approve their own request, even holding
  a manager+ role. Approval resolves the payment's own configured gateway
  (`REQ175`) and calls its `.refund()`; for Razorpay the final `'refunded'`
  state is set by its own webhook (the authoritative source, matching
  `payment.captured`'s existing pattern); the other three gateways' refund
  APIs are synchronous, so the state is set immediately.
- `handleRazorpayWebhook` gained real `refund.processed`/`refund.failed`
  handling — the exact gap the pre-existing code's own honest comment
  named, closed here (a refund event is identified by its own
  `payment_id`, not `order_id`, since it carries no order reference).
- `appointments/detail.jsx` gained a "Request Refund" action (cancelled
  appointment with a real succeeded, not-already-refunded payment) and
  `finances/index.jsx` gained a "Refunds" tab mirroring the existing
  Discount Approvals queue UI exactly.

## Real bugs found and fixed while building this

1. **Two Hard-Rule-9 (money-as-paise) violations of my own making**, caught
   before shipping by re-reading the file's own established convention: the
   new `AppointmentType.reschedule_fee_amount` and
   `RefundRequestType.requested_amount` fields both initially returned raw
   paise instead of converting to rupees at the resolver boundary, unlike
   every other money field on these same entities (`price`,
   `discount_amount`, `expected_amount`). Fixed both, and widened
   `reschedule_fee_amount`'s GraphQL type from `Int` to `Float` — a
   percentage-type fee's rupee value isn't always a round number, and `Int`
   would throw a GraphQL serialization error on the first non-round-hundred
   fee.
2. **A tautological no-op**: an early draft of `requestRefund()`'s
   "when was this cancelled" computation read
   `cancellation_reason ? new Date() : new Date()` — both branches
   identical. Fixed to `payment.appointment.updated_at` (this schema has no
   dedicated `cancelled_at` timestamp), with a comment explaining why.
3. **A real Cashfree correctness bug**, found while writing that adapter's
   own unit test: Cashfree's refund endpoint is scoped by the Payment
   Link's own `link_id` (`/pg/links/{link_id}/refunds`), not the captured
   `cf_payment_id` — a genuinely different id than Razorpay/PayU/PhonePe's
   own refund APIs key off. `RefundParams` widened with an optional
   `gatewayOrderId`, and `decideRefundRequest`'s call site now passes both.
4. **`$transaction` array-form vs. callback-form**: an early draft of
   `decideRefundRequest`'s reject/approve paths used the array form
   (`this.prisma.$transaction([update1, update2])`), inconsistent with
   every other `$transaction` call in this same service file (all
   callback-form, `async (tx) => {...}`). Rewritten to match — the array
   form works against real Prisma too, but this file's own mocked-prisma
   test convention only stubs the callback shape, and consistency matters
   more than either form's own merits here.
5. **`clinicRefundRequests`'s `clinic_id` was initially required**, which
   doesn't fit the tenancy matrix's generic no-required-args `CASES` shape
   (`discountApprovalRequests`' own sibling query already established this
   dual-mode pattern: an omitted `clinic_id` scopes across the caller's
   whole org via `orgScope()`). Widened to nullable, and
   `myClinicRefundRequests()`'s own cross-org check rewritten from a
   separate `clinics.findUnique` lookup to `orgScope()` directly, matching
   `discountApprovalRequests()`'s own service-layer shape exactly.

## Deliberately NOT built (recorded, not silently dropped)

- A patient-facing self-service "request my own refund" flow — this is
  staff/clinician-initiated, manager+-approved only, matching the approval
  queue's own trust model (mirroring `REQ056`'s discount-approval
  precedent).
- Partial refunds spanning multiple tenders with different per-tender
  amounts — a refund always nets against the total payment.

## Acceptance criteria

**US-PAY-03**: As staff/clinician, I can request a refund for a cancelled
appointment's payment, with the amount computed by the org's own policy, not
typed in.
- Given a cancelled appointment with a ₹1000 succeeded payment and a rule
  requiring 48h notice with a 20% fee, when the appointment was cancelled
  with only 24h notice, then requesting a refund computes ₹800 (not the
  full ₹1000), server-side.
- Given no matching cancellation-fee rule exists for the org, when a refund
  is requested, then the full amount is requested (no hidden fee default).

**US-PAY-04**: As a manager, I can approve or reject a refund request, and
approving never lets the requester approve their own request.
- Given staff member A requested a refund, when A (even if also a manager)
  tries to decide it, then the decision is rejected with "Cannot approve
  your own refund request."
- Given a manager (not the requester) approves, then the payment's own
  configured gateway processes a real refund and `refund_status` updates.

## Data model impact

`RefundRequests` (new), `AppointmentPayments` gains `refund_status`,
`refund_amount`, `refund_reason`, `refunded_at`, `gateway_refund_id`.
`ProductCancellationRules.product_id`/`rule_type` — schema-only fields, now
real read/write paths.
