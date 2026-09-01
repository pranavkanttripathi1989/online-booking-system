---
id: CTX-patient-payments-2026-09-01-req175-176-177
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ175
related: [REQ176, REQ177, PLAN244, PLAN245, PLAN246, TP264, TP265, TP266, TR264, TR265, TR266]
---

# patient-payments — multi-gateway registry, refund engine, reschedule fee, pay-at-clinic, pharmacy payment (2026-09-01)

Direct user request: real support for Cashfree/PayU/PhonePe alongside the
existing Razorpay integration, each clinic (and pharmacy) able to
configure its own gateway account; a real refund engine driven by how far
in advance a cancellation/reschedule happens, with per-service and
per-cancellation/reschedule fee configuration; a manager approval queue
before any refund fires. Entered plan mode, wrote a full technical plan
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`),
resolved three genuine ambiguities via `AskUserQuestion` (gateway scope,
account granularity, refund execution — all resolved to the Recommended
option), got the plan approved, then implemented across backend and
frontend in one continuous pass, with a mid-turn user follow-up
("cancellation fees on the basis of service, percentage/fixed amount...
same for rescheduling") directly reshaping and confirming the
`REQ176`/per-service scope while implementation was already underway.

## Documents

| Root | Slice | ID | Doc |
|---|---|---|---|
| requirements | Gateway registry | REQ175 | [doc](../../requirements/patient-payments/requirement/REQ175-patient-payments-2026-09-01-multi-gateway-registry.md) |
| requirements | Refund engine + approval queue | REQ176 | [doc](../../requirements/patient-payments/requirement/REQ176-patient-payments-2026-09-01-refund-engine-and-approval-queue.md) |
| requirements | Reschedule fee / pay-at-clinic / pharmacy payment | REQ177 | [doc](../../requirements/patient-payments/requirement/REQ177-patient-payments-2026-09-01-reschedule-fee-pay-at-clinic-pharmacy-payment.md) |
| implementation-plans | Gateway registry | PLAN244 | [doc](../../implementation-plans/patient-payments/requirement/PLAN244-patient-payments-2026-09-01-multi-gateway-registry.md) |
| implementation-plans | Refund engine + approval queue | PLAN245 | [doc](../../implementation-plans/patient-payments/requirement/PLAN245-patient-payments-2026-09-01-refund-engine-and-approval-queue.md) |
| implementation-plans | Reschedule fee / pay-at-clinic / pharmacy payment | PLAN246 | [doc](../../implementation-plans/patient-payments/requirement/PLAN246-patient-payments-2026-09-01-reschedule-fee-pay-at-clinic-pharmacy-payment.md) |
| test-plans | Gateway registry | TP264 | [doc](../../test-plans/patient-payments/requirement/TP264-patient-payments-2026-09-01-multi-gateway-registry.md) |
| test-plans | Refund engine + approval queue | TP265 | [doc](../../test-plans/patient-payments/requirement/TP265-patient-payments-2026-09-01-refund-engine-and-approval-queue.md) |
| test-plans | Reschedule fee / pay-at-clinic / pharmacy payment | TP266 | [doc](../../test-plans/patient-payments/requirement/TP266-patient-payments-2026-09-01-reschedule-fee-pay-at-clinic-pharmacy-payment.md) |
| test-results | Gateway registry | TR264 | [doc](../../test-results/patient-payments/requirement/TR264-patient-payments-2026-09-01-multi-gateway-registry.md) |
| test-results | Refund engine + approval queue | TR265 | [doc](../../test-results/patient-payments/requirement/TR265-patient-payments-2026-09-01-refund-engine-and-approval-queue.md) |
| test-results | Reschedule fee / pay-at-clinic / pharmacy payment | TR266 | [doc](../../test-results/patient-payments/requirement/TR266-patient-payments-2026-09-01-reschedule-fee-pay-at-clinic-pharmacy-payment.md) |

## What shipped

- **Schema** (`20260902010000_payment_gateways_refunds`, all additive):
  `PaymentGatewayConfig`, `RefundRequests`, `PharmacyPayments`;
  `AppointmentPayments` gains `gateway`/`gateway_order_id`/
  `gateway_payment_id`/`gateway_reference`/`refund_status`/
  `refund_amount`/`refund_reason`/`refunded_at`/`gateway_refund_id`.
- **Gateway registry (REQ175)**: `backend/src/payment-gateways/` — one
  shared `PaymentGatewayProvider` interface, four adapters (Razorpay
  refactored behaviour-preservingly; Cashfree/PayU/PhonePe new,
  unit-tested against hand-derived vendor signature fixtures, NOT
  live-verified — no sandbox credentials exist in this environment for
  those three), per-clinic encrypted credentials with a platform-default
  fallback (zero regression). `settings/index.jsx` gained a "Payment
  Gateway" section mirroring `admin/Communications.jsx`'s SMS provider
  card.
- **Refund engine (REQ176)**: `common/scheduling/cancellation-fee.ts`
  (pure functions, most-specific-rule-wins policy resolution);
  `ProductCancellationRules.product_id`/`rule_type` — schema-only since
  `REQ006`, now real read/write paths, closing exactly what the user's
  own mid-turn follow-up asked for; `RefundRequests` mirrors
  `DiscountApprovalRequests`' request/decide-later shape exactly,
  including "the requester can never approve their own request."
  `finances/index.jsx` gained a Refunds tab; `appointments/detail.jsx`
  gained a Request Refund action.
- **Reschedule fee / pay-at-clinic / pharmacy payment (REQ177)**:
  `appointments.service.ts#update()` computes a reschedule fee via the
  same policy engine; `booking/index.jsx` gained a real, equal-weight
  Pay Online/Pay at Clinic choice (PAY-2); `recordPharmacyPayment` +
  `manager/pharmacy/index.jsx`'s "Collect Payment" action close the
  "pharmacy dispensing collects zero payment" gap from `REQ022`.

## Real bugs found and fixed during this pass

1. **Two Hard-Rule-9 (money-as-paise) violations**, both self-caught
   before shipping: `reschedule_fee_amount` and `RefundRequestType
   .requested_amount` both initially returned raw paise instead of
   converting to rupees at the resolver boundary, unlike every sibling
   money field on the same entities. Fixed both; widened
   `reschedule_fee_amount`'s GraphQL type `Int → Float` (a percentage
   fee's rupee value isn't always round).
2. **A tautological no-op** in an early `requestRefund()` draft
   (`cancellation_reason ? new Date() : new Date()`) — caught by
   self-review, fixed to `payment.appointment.updated_at`.
3. **A real Cashfree correctness bug**: its refund endpoint is scoped by
   the payment LINK id, not the captured `cf_payment_id` — a genuinely
   different id than the other three gateways key off. Found writing
   that adapter's own unit test, before any live account could hit it.
   `RefundParams` widened with an optional `gatewayOrderId`.
4. **`$transaction` array-form inconsistency** in `decideRefundRequest`,
   caught by its own unit test failing with `TypeError: fn is not a
   function` against this file's established callback-form mock
   convention — rewritten to match every other `$transaction` call in
   the same service file.
5. **`clinicRefundRequests`'s required `clinic_id`** didn't fit the
   tenancy matrix's generic shape — widened to nullable, matching
   `discountApprovalRequests`' own dual-mode precedent, and
   `myClinicRefundRequests()`'s cross-org check rewritten from a
   separate clinic lookup to `orgScope()` directly.
6. **`booking/index.jsx`'s own test suite** broke once `prepayment_policy`
   was added to the real `GET_CLINICIAN_AND_PRODUCTS` query — its
   locally-duplicated query literal (a documented, necessary
   `MockedProvider` pattern) went out of sync. First read as
   resource-contention flakiness in a combined run; an isolated re-run
   confirmed it was real and consistent. Fixed by updating the test's
   own duplicated query + mock data.

## Deliberately NOT built (recorded, not silently dropped)

- Live verification of Cashfree/PayU/PhonePe against real sandbox
  accounts — no credentials exist in this environment; each adapter is
  unit-tested against hand-derived fixtures from that vendor's own
  published contract, stated honestly as unverified in `TR264`.
- An online-gateway checkout path for pharmacy purchases (counter
  payment only).
- Partial refunds spanning multiple tenders with different per-tender
  amounts.
- A patient-facing self-service refund request flow (staff/
  clinician-initiated, manager+-approved only, per the approved plan).
- A pre-existing, adjacent gap flagged but not fixed: `bookPatientAppointment`'s
  online path never checks `prepayment_policy` either (always
  `status: 'scheduled'` unconditionally) — out of this slice's scope.

## Verification

Backend: 142 suites / 2260 tests green (`npx jest --maxWorkers=2`),
`tsc --noEmit`/`eslint` clean. Integration: 8/9 suites clean including
`matrix-coverage.int-spec.ts`; `tenancy.int-spec.ts`'s 3 failures are a
pre-existing, unrelated date-drift bug in a shared fixture constant this
session's diff never touched (see `TR265`). Frontend: `eslint`/`build`
clean across all touched files; the 4 directly-relevant Jest suites
(`booking`, `settings`, `appointments/detail`, `manager/pharmacy`) 34/34
green. Live: real GraphQL schema introspection confirmed every new
query/mutation genuinely served (not just compiled); a real
`updatePaymentGatewayConfig` round-trip confirmed encryption at rest via
direct `psql`; a real, live per-service reschedule-fee cancellation rule
was created, listed, and deleted against the dev DB. Test residue
cleaned up in every case.
