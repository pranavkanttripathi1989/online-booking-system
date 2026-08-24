---
id: REQ056
type: improvement
feature: patient-payments
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: REQ023
related: [REQ023]
---

# Day-end cash close + discount-approval workflow

## Source

`REQ023`'s own P1 remainder (`US-BIL-03`/`US-BIL-04`) — mixed-tender
counter billing and GST/invoice numbering already shipped (a prior
session's `recordCounterPayment`, `REQ047`); only the discount-approval
gate and day-end close itself remained open.

## User stories

**US-BIL-03** — As a Branch Manager, I want discounts to require a reason
code and, above a threshold, an approval, so that front-desk staff cannot
silently give away revenue.

- PRD ref: `FR-BIL-04`
- Priority: P0
- Acceptance criteria: given a discount above the configured threshold, it
  cannot be applied without a second, higher-role approval, and every
  discount (approved or not) is written to the audit log.

**US-BIL-04** — As a Branch Manager, I want a day-end close showing
expected vs. actual cash by user with a denomination sheet, so that
shortfalls are caught the same day.

- PRD ref: `FR-BIL-08`
- Priority: P0
- Acceptance criteria: given a shift's recorded cash collections, when
  day-end close runs, variance between expected and counted cash is
  captured with denomination breakdown, and the shift is formally handed
  to the next user.

## Scope decision — a subset of each story, not the full PRD language

Both acceptance criteria describe more than this slice builds. `US-BIL-04`
names a "denomination sheet" (₹500/₹200/₹100/... note-by-note counts) and a
formal "shift handover" — this slice builds per-tender-type (cash/UPI/
card/cheque) expected-vs-counted variance for a `(clinic, business_date)`
pair instead, which is the load-bearing half of the story (catching a
shortfall) without inventing a `Shifts` concept this codebase has no other
use for yet. `US-BIL-03`'s "written to the audit log" is satisfied by the
`DiscountApprovalRequests` row itself being the durable record (who
requested, who decided, when) rather than a second write into the generic
`AuditLogs` table — that table's own `AuditLogInterceptor` fires from
GraphQL mutations generically; a discount decision already gets a
purpose-built, queryable record with its own status lifecycle, which is
strictly more useful for this specific workflow than a generic log line
would be.

## Research finding — no existing dual-approval precedent

Grepping `approved_by`/`approver`/`dual-approv` across `backend/src` and
`schema.prisma` returned zero hits. `RolesGuard` only ever checks the
single calling JWT's own roles — this codebase has no mechanism for a
mutation to verify a *second* party's identity within one call. Rather
than invent one, this slice uses the same request/decide async pattern
`REQ034`'s `RightsRequests` already established (queue a request, a
higher-role-gated separate mutation decides it later) — `recordCounterPayment`
queues a `DiscountApprovalRequests` row when the discount exceeds the
org's configured threshold, and a distinct `decideDiscountApproval`
mutation (gated `manager`/`admin`/`super_admin` only, excluding `staff`
even though `recordCounterPayment` itself allows `staff`) approves or
rejects it. The service layer additionally rejects a requester approving
their own request, even if they happen to hold a manager+ role — the
resolver-level role gate alone can't express "not this specific caller."

## Data-model impact

- `AppointmentPayments` gains `discount_amount` (paise, default 0),
  `discount_reason`, `approved_by_user_id` (null unless the discount
  exceeded the threshold and was later approved).
- `ClientOrganizations` gains `discount_approval_threshold_paise` (default
  ₹1000/100000 paise), following the exact configurable-per-org-numeric
  pattern `REQ052`'s `no_show_grace_minutes`/`no_show_prepayment_threshold`
  already established on the same model.
- New `DiscountApprovalRequests` (appointment/clinic/org, requester,
  discount amount + reason, `expected_amount_paise` captured at request
  time so approval never re-derives pricing, `tenders_json` — the queued
  tender split, replayed verbatim on approval — status, approver,
  `resulting_payment_id`).
- New `CashDrawerCloseouts` (`@@unique([clinic_id, business_date])`,
  `breakdown_json` keyed by tender type, matching this schema's own
  `channel_pricing_json`-style convention for a small tender-keyed map
  rather than one column per type). Expected totals are always computed
  server-side from real succeeded `AppointmentPayments`/`PaymentTenders`
  rows for that clinic/date — never trusted from the caller; only the
  counted (physical) totals come from the input.
- `recordCounterPayment`'s existing "tenders must sum to exactly the
  amount due" validation now compares against the amount **after**
  discount, not the master amount — a real behavioural change, but the
  only one: every pre-existing caller that never sets `discount_amount`
  sees byte-for-byte identical behaviour (discount defaults to 0, net
  amount equals the original amount due).

## Out of scope (deferred, not silently dropped)

Denomination-level (note-by-note) breakdown; formal shift handover between
users; a generic `AuditLogs` write for the discount decision (the
`DiscountApprovalRequests` row itself is the durable record — see above);
retroactive cash-close for a date that already has a closeout (rejected
outright by the unique constraint, not offered as an edit); admin UI
(backend-only, per this batch's confirmed direction).
