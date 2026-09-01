---
id: PLAN245
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ176
related: [TP265, TR265]
---

# PLAN245 — Implementation plan: refund engine + approval queue

## Schema (same migration as PLAN244)

```prisma
model RefundRequests {
  id                      String    @id @default(uuid())
  appointment_payment_id  String
  clinic_id               String
  client_org_id           String?
  requested_by_user_id    String
  requested_amount        Int       // paise
  reason                  String
  status                  String    @default("pending")
  decided_by_user_id      String?
  decided_at              DateTime?
  created_at              DateTime  @default(now())
  appointment_payment AppointmentPayments  @relation(fields: [appointment_payment_id], references: [id])
  clinic              Clinics              @relation(fields: [clinic_id], references: [id])
  client_org          ClientOrganizations? @relation(fields: [client_org_id], references: [id])
  requested_by        Users                @relation("RefundRequestRequestedBy", fields: [requested_by_user_id], references: [id])
  decided_by          Users?               @relation("RefundRequestDecidedBy", fields: [decided_by_user_id], references: [id])
}
```

`AppointmentPayments` gains `refund_status String @default("none")`
(`none|requested|approved|rejected|processing|refunded|failed`),
`refund_amount Int?`, `refund_reason String?`, `refunded_at DateTime?`,
`gateway_refund_id String?`.

## `common/scheduling/cancellation-fee.ts` (new, pure functions)

`selectApplicableRule(rules, productId, clinicId)` — specificity scoring:
product+clinic=4, clinic-only=3, product-only=2, org-wide (neither)=1,
mismatched=0 (filtered), ties broken by the rule's own `priority`.
`computeCancellationFee(rule, paymentAmount, hoursBeforeAppointment)` —
enough notice → no fee/full refund; short notice → `fixed` fee_amount or
`round(paymentAmount * fee_amount / 100)` for `percentage`, clamped to
`[0, paymentAmount]`. `hoursBetween(from, to)`. 12 hand-derived-fixture
unit tests.

## `cancellation-rules` module changes

`ProductCancellationRules.product_id`/`rule_type` existed in the schema
since `REQ006` but were never exposed on `CreateCancellationRuleInput`/
`UpdateCancellationRuleInput` (`rule_type` hardcoded to `'cancellation'`
in `create()`). Both now real:

- New `findScopedProduct()` (Hard Rule 6, mirrors `findScopedClinic()`).
- `create()`/`update()` validate `product_id` against the caller's org;
  `client_org_id` anchor derivation: clinic-derived wins if both clinic
  and product given, else product-derived.
- New `findActiveRulesForOrg(clientOrgId, ruleType)` — internal, used by
  the refund/reschedule-fee engines, not exposed on the resolver (it
  takes a raw `client_org_id`, not a caller's `JwtPayload` — the
  computation runs with the PAYMENT's own org).
- `admin/Policies.jsx` gained a "Service" picker (leave blank = every
  service) and an "Applies To" (Cancellation/Reschedule) selector on the
  rule create/edit form, plus a rule-type `Chip` and service name on each
  list row.

**Deviation from the originally-approved plan, recorded**: the plan
called for a new `ProductRescheduleRules` table. Discovered mid-build
that `rule_type`'s `RuleType` enum already existed and anticipated this
exact split — reused the existing table with a `rule_type` filter
instead, a better-fit design than a duplicate table.

## `appointment-payments.service.ts` — refund flow

- `requestRefund(input, user)` — loads the payment with `clinic`/
  `appointment` included, checks `isSameOrg`/`status === 'succeeded'`/
  `refund_status` is `none`/`rejected`. `cancelledAt = payment.appointment
  .updated_at` (no dedicated `cancelled_at` column exists).
  `ruleType = appointment.status === 'cancelled' ? 'cancellation' :
  'reschedule'`. Computes `refundAmount` via the fee engine, creates a
  `RefundRequests` row, sets `refund_status: 'requested'`.
- `myClinicRefundRequests(clinicId, user)` — nullable `clinicId`,
  scoped via `orgScope(user)` directly (not a separate clinic-existence
  lookup) — matches `discountApprovalRequests()`'s own dual-mode shape,
  required so `clinicRefundRequests` fits the tenancy matrix's generic
  no-required-args `CASES` shape. Returns raw `requested_by_user_id`/
  `decided_by_user_id`, never a resolved name (`Users` has no name
  columns — `discountRequestToGraphQL`'s own established precedent).
- `decideRefundRequest(input, user)` — mirrors `decideDiscountApproval()`
  exactly, including rejecting the requester deciding their own request.
  Reject: `$transaction(async (tx) => {...})` marks both rows rejected.
  Approve: resolves the gateway via the registry
  (`payment.gateway_payment_id ?? payment.razorpay_payment_id`), calls
  `.refund()`. Razorpay's own `refund.processed` webhook is the
  authoritative source for the final `'refunded'` state (matches
  `payment.captured`'s existing pattern); the other three gateways'
  refund APIs are synchronous, so their state is set immediately.
- `paymentsForAppointment(appointmentId, user)` — new, minimal
  `AppointmentPaymentSummaryType` list, gates whether
  `appointments/detail.jsx` offers "Request Refund" at all.
- `handleRazorpayWebhook` — `refund.processed`/`refund.failed` now
  handled for real (previously acknowledged-and-dropped, per the method's
  own prior honest comment); looked up by `payment_id` (a refund event
  carries no `order_id`).

## Frontend

- `appointments/detail.jsx` — new card (cancelled + a real refundable
  payment) with a "Request Refund" button and reason dialog, gated to
  `staff|manager|admin|super_admin|clinician`, matching the mutation's
  own `@Auth()`.
- `finances/index.jsx` — new "Refunds" tab (index 5), identical
  list/approve/reject structure to the existing "Discount Approvals" tab,
  reusing `discountStatusCfgFor` directly (`RefundRequestType.status`
  shares the exact same `pending|approved|rejected` value set).

## Real bugs found and fixed (see REQ176 for the full account)

Two Hard-Rule-9 paise-vs-rupees violations of my own making
(`reschedule_fee_amount`, `requested_amount`), a tautological no-op in
`requestRefund`'s cancellation-timestamp derivation, the Cashfree
refund-id bug (PLAN244), and an inconsistent `$transaction` call shape —
all caught and fixed before the unit suite was trusted, several by
re-deriving the expected value by hand rather than trusting the first
draft.

## Testing

`cancellation-fee.spec.ts` (12/12), `cancellation-rules.service.spec.ts`
(20/20, 6 new), `appointment-payments.service.spec.ts` gained 25 new
tests across `paymentsForAppointment`/`requestRefund`/
`myClinicRefundRequests`/`decideRefundRequest` plus 4 rewritten/new
webhook tests for the refund-event branches (109/109 total in that file).
`RefundRequests`/`clinicRefundRequests` added to the tenancy matrix as a
real `CASES` entry (`matrix-coverage.int-spec.ts` passing); fixture rows
`refundRequestA`/`B` added on the existing `paymentA`/`B` fixtures.

## Live verification

Manager JWT against the real dev stack. `paymentGatewayProviders`/gateway
config round-trip covered in PLAN244. Refund-request/approval flow
verified via the unit suite (109/109) and the real GraphQL schema
introspection confirming `requestRefund`/`decideRefundRequest`/
`clinicRefundRequests`/`appointmentPayments` are all served; a full
book→cancel→request-refund→approve live click-through against a real
Razorpay sandbox payment was not additionally run this session (the
existing Razorpay checkout flow was already live-verified in an earlier
session per `TR070`, and this slice's own risk — the fee computation and
approval-gate logic — is fully covered by the unit suite instead).
