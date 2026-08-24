---
id: CTX-patient-payments-2026-08-24-req023
type: requirement
feature: patient-payments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ023
related: [REQ004, REQ040, REQ047, PLAN064, TP091, TR090]
---

# patient-payments — REQ023 slice: mixed-tender counter billing (2026-08-24)

Fifth and final of five PRD-derived requirement slices picked and built in
one pass (REQ014 → REQ029 → REQ025 → REQ016 → **REQ023**).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ023 | [billing depth: mixed tenders, day-end close, doctor revenue-share, and reconciliation](../../requirements/patient-payments/requirement/REQ023-patient-payments-2026-08-22-billing-depth-and-revenue-share.md) |
| implementation-plans | PLAN064 | [mixed-tender counter billing](../../implementation-plans/patient-payments/requirement/PLAN064-patient-payments-2026-08-24-mixed-tender-counter-billing.md) |
| test-plans | TP091 | [verification plan](../../test-plans/patient-payments/requirement/TP091-patient-payments-2026-08-24-mixed-tender-counter-billing.md) |
| test-results | TR090 | [verification results — pass](../../test-results/patient-payments/requirement/TR090-patient-payments-2026-08-24-mixed-tender-counter-billing.md) |

## Scope correction from research

Two of `REQ023`'s named P0 items turned out already done (`US-BIL-09` GST
fields, shipped by `REQ047`) or already deliberately-decided-against
(`US-BIL-08`, `@Public()` on `createRazorpayOrder` staying on purpose per
`REQ040`'s own reasoning — re-adding a blanket auth check would regress a
previously-fixed real bug, `BUG011`). Confirmed against the real code and
git history before scoping this slice, not assumed from the requirement
doc's own 2026-08-22 "current state" section. What's genuinely open:
`US-BIL-01`'s mixed-tender concept, scoped down to a single appointment's
payment closed by a front-desk-recorded cash/UPI/card/cheque split.

## What shipped

- New `PaymentTenders` table — line items under one `AppointmentPayments`
  row, distinguished from the Razorpay path by which nullable fields are
  populated (this table's own existing convention).
- `recordCounterPayment` mutation, reusing `resolveServicePrice()`
  (channel `'walkin'`) and `invoiceDetailsForSuccess()` (`REQ047`,
  unchanged) rather than re-deriving either. Tenders must sum exactly — no
  partial close in this slice.
- `@Auth('staff', 'manager', 'admin', 'super_admin')` — a genuine staff-
  auth operation, unlike `createRazorpayOrder`'s deliberate `@Public()`.
- New "Take Payment" action + dialog on `appointments/detail.jsx`, reusing
  the already-resolved `service.price` field from Slice 4's own display-
  mapping fix.
- Tests: 7 new unit tests.

## Live verification — the full Slice 4 + Slice 5 chain confirmed together

Live-tested end to end against real dev-seeded data: set a `'walkin'`
channel override on the real "GP Consultation" service, confirmed
`recordCounterPayment` correctly resolved ₹450 (not the base ₹499) as the
amount due, correctly rejected a ₹499 split, and correctly accepted a
₹300 cash + ₹150 UPI split, returning a real gapless invoice number
(`INV/2026-27/7307C9D9/00001`). This is the strongest available live
confirmation that Slice 4's price-consistency design actually holds
end-to-end, not just at the unit level. Reverted the shared dev service
back to its pre-test state afterward.

## What's deliberately not built yet

`US-BIL-02` (UPI-QR auto-detect), `US-BIL-03` (discount-with-approval),
day-end close, doctor revenue-share, corporate credit, reconciliation
console — all explicitly out of this slice's scope, logged as open per
`PLAN064`, not silently dropped.

## This closes the five-slice pass

REQ014 → REQ029 → REQ025 → REQ016 → REQ023, all five shipped and verified
in one continuous pass. See each slice's own bundle for full detail.
`REQ032` (subscription plan engine) remains the one deliberately-paused
item from the prior session, untouched by this pass.
