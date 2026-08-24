---
id: PLAN079
type: improvement
feature: patient-payments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ056
related: [REQ023]
---

# PLAN079 — Implementation plan: day-end cash close + discount-approval workflow

## Scope

`REQ056` (`US-BIL-03`/`US-BIL-04`, `REQ023`'s own P1 remainder) — a
discount above a configurable threshold requires a second, higher-role
approval before it's ever applied; a day-end cash close reports
expected-vs-counted variance per tender type for a clinic/date.

## Research findings that shaped the design

`recordCounterPayment` (`appointment-payments.service.ts`) had zero
discount concept before this slice — no `discount`-shaped field anywhere
in `schema.prisma` or `backend/src`. No dual-approval precedent exists
anywhere in this codebase either (`RolesGuard` only ever checks the single
calling JWT's own roles) — the design had to invent a mechanism rather
than copy one, and did so by reusing `REQ034`'s `RightsRequests`
request/decide-later shape rather than a genuinely new pattern.
`REQ052`'s `no_show_grace_minutes`/`no_show_prepayment_threshold` on
`ClientOrganizations` is the real precedent for the configurable
threshold itself — `discount_approval_threshold_paise` was added
alongside them on the same model, same "plain org-scoped column, no
separate settings table" shape.

## Design

`AppointmentPayments` gains `discount_amount`/`discount_reason`/
`approved_by_user_id`. `recordCounterPayment` computes
`netAmount = expectedAmount - discountAmountPaise`, validates tenders sum
to `netAmount` (not the pre-discount amount — the one real behavioural
change to this existing method; every pre-existing caller defaults
`discount_amount` to 0, so `netAmount === expectedAmount` and behaviour is
byte-for-byte unchanged for them). A discount requires a reason; a
discount can never exceed the amount due.

**The threshold branch**: `discountAmountPaise > threshold` (read from
`appointment.clinic.client_organization.discount_approval_threshold_paise`,
defaulting to ₹1000/100000 paise if unset) queues a
`DiscountApprovalRequests` row instead of creating any payment —
`expected_amount_paise` is captured now so approval never has to
re-resolve pricing (a service's price could genuinely change between
request and approval), and `tenders_json` stores the caller's exact tender
split for later replay. The method returns `{success: true,
pending_approval_id}` — `payment_id`/`invoice_number` stay unset, and the
caller distinguishes the two outcomes by which field is populated.

**`decideDiscountApproval`** (`manager`/`admin`/`super_admin` only —
deliberately excludes `staff`, unlike `recordCounterPayment`'s own gate)
rejects a request that's already been decided, and rejects the original
requester approving their own request even if they hold a manager+ role
themselves (`request.requested_by_user_id === user.sub` check) — the
resolver-level `@Auth()` gate alone can express "manager-or-above," not
"a genuinely different person," so the service layer adds the second
check the control actually needs. Approving replays the stored
`tenders_json` and calls the same `finalizeCounterPayment` private helper
`recordCounterPayment`'s own below-threshold path uses — **exactly one
place in the codebase ever creates a real counter-payment
`AppointmentPayments` row**, whether or not a discount needed approval.
Rejecting creates no payment at all.

**`closeCashDrawer`** computes expected totals server-side, grouped by
tender type, from real succeeded `PaymentTenders` rows joined through
`AppointmentPayments` for the given clinic and UTC calendar day — never
trusted from the caller. Only the counted (physical) totals come from the
input. `@@unique([clinic_id, business_date])` makes a second close
attempt for an already-closed date fail outright (a real `P2002` caught
and turned into a clean `{success: false, message}`), rather than
silently overwriting an earlier count.

`discountApprovalRequests(clinic_id?)`/`cashDrawerCloseouts(clinic_id?)`
both keep `clinic_id` optional, applying this batch's own established
tenancy-matrix-compatibility pattern proactively.

## Testing

`appointment-payments.service.spec.ts` — 20 new cases across five new
describe blocks: discount validation (no reason, exceeds amount due,
tenders must match net amount), below-threshold inline application (no
approval row created, `approved_by_user_id` stays null), above-threshold
queueing (a second, higher-priced fixture genuinely exercises the queue
branch rather than colliding with the "discount exceeds amount due"
guard; a per-org threshold override respected), `decideDiscountApproval`
(nonexistent/cross-org/already-decided/self-approval all rejected; reject
creates no payment; approve replays tenders and stamps the approver),
`closeCashDrawer` (cross-org clinic, invalid date, real variance
computation from mocked succeeded tenders, the unique-constraint
double-close rejection), and list-query org scoping for both new queries.
All 59 pre-existing tests in this file still pass unchanged — the
`?? 100000` threshold default and `discount_amount` defaulting to 0 mean
every fixture that predates this slice behaves identically.

`discountApprovalRequests` added to `matrix-coverage.int-spec.ts`'s
`CASES` as a second row on the already-covered `appointment-payments`
domain (matching `getTransactionsByDate`'s own row) — real Postgres, real
JWT, real guard chain. `cashDrawerCloseouts` was deliberately left
unit-tested only (already thoroughly covered, including org-scoping) — a
second CASES row per slice is not this session's own established
convention, and `discountApprovalRequests` is the more security-sensitive
of the two new queries.

Full suite: backend unit — 79/79 suites, 1184/1184 tests (was 79/1165
after `REQ055`). `eslint`/`tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped)

See `REQ056`'s own doc — denomination-level breakdown, formal shift
handover, a generic `AuditLogs` write for the discount decision (the
`DiscountApprovalRequests` row itself is the durable record), admin UI.
