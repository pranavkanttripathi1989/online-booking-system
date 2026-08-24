---
id: CTX-patient-payments-2026-08-25-req056
type: improvement
feature: patient-payments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ056
related: [REQ023, PLAN079, TP106, TR105]
---

# patient-payments — REQ056: day-end cash close + discount-approval workflow (2026-08-25)

Sixth slice in the 8-slice batch picked from `project-plans/` this session
(research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ056 | [cash close + discount approval](../../requirements/patient-payments/improvement/REQ056-patient-payments-2026-08-25-cash-close-and-discount-approval.md) |
| implementation-plans | PLAN079 | [implementation plan](../../implementation-plans/patient-payments/improvement/PLAN079-patient-payments-2026-08-25-cash-close-and-discount-approval.md) |
| test-plans | TP106 | [verification plan](../../test-plans/patient-payments/improvement/TP106-patient-payments-2026-08-25-cash-close-and-discount-approval.md) |
| test-results | TR105 | [verification results — pass, 79/79 + 4/4 suites](../../test-results/patient-payments/improvement/TR105-patient-payments-2026-08-25-cash-close-and-discount-approval.md) |

## What shipped

`recordCounterPayment` gains a discount path: at/below a configurable
org threshold (`ClientOrganizations.discount_approval_threshold_paise`,
following `REQ052`'s exact configurable-numeric precedent), a discount
applies inline; above it, a `DiscountApprovalRequests` row is queued
instead and a distinct `decideDiscountApproval` mutation (manager+ only,
excluding the requester even if they hold that role themselves) approves
or rejects it — reusing `REQ034`'s `RightsRequests` request/decide-later
shape since no dual-approval mechanism existed anywhere in this codebase
before. `closeCashDrawer`/`CashDrawerCloseouts` compute expected
per-tender-type totals server-side from real succeeded payments,
never trusted from the caller.

## Scope decisions, documented not silently dropped

`REQ023`'s own P1 language names a denomination sheet and formal shift
handover for the cash-close story, and a generic audit-log write for the
discount story — this slice builds the load-bearing subset of each (a
per-tender variance report; the `DiscountApprovalRequests` row itself as
the durable record) and says so explicitly in `REQ056`'s own doc, per
this session's established convention.

## Verification

Backend unit: 79/79 suites, 1184/1184 tests (was 79/1165). Integration
(from host): 4/4 suites, 360/360 tests (was 351), including a new
`discountApprovalRequests` tenancy-matrix case on the already-covered
`appointment-payments` domain. `eslint`/`tsc --noEmit` clean. Container
restarted and confirmed a clean compile (took longer than prior slices
under host load — confirmed via `docker stats` as active compilation, not
a wedge).
