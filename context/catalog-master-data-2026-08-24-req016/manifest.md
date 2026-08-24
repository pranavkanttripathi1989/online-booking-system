---
id: CTX-catalog-master-data-2026-08-24-req016
type: requirement
feature: catalog-master-data
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ016
related: [REQ044, REQ046, PLAN063, TP090, TR089]
---

# catalog-master-data — REQ016 slice: differentiated pricing by patient category and channel (2026-08-24)

Fourth of five PRD-derived requirement slices picked and built in one pass
(REQ014 → REQ029 → REQ025 → **REQ016** → REQ023).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ016 | [catalogue extensions: packages, drug master, per-category pricing, tax depth](../../requirements/catalog-master-data/requirement/REQ016-catalog-master-data-2026-08-22-packages-drug-master-and-tax-depth.md) |
| implementation-plans | PLAN063 | [differentiated pricing by patient category and channel](../../implementation-plans/catalog-master-data/requirement/PLAN063-catalog-master-data-2026-08-24-differentiated-pricing.md) |
| test-plans | TP090 | [verification plan](../../test-plans/catalog-master-data/requirement/TP090-catalog-master-data-2026-08-24-differentiated-pricing.md) |
| test-results | TR089 | [verification results — pass](../../test-results/catalog-master-data/requirement/TR089-catalog-master-data-2026-08-24-differentiated-pricing.md) |

## What shipped

- `Patients.patient_category` (general/corporate/staff/camp),
  `Products.category_pricing_json`/`channel_pricing_json`.
- One shared `resolveServicePrice()` helper
  (`backend/src/common/pricing/`), imported by both real call sites
  (`appointments.service.ts`'s display mapping,
  `appointment-payments.service.ts`'s `createRazorpayOrder`) — neither
  reads `Products.price` directly anymore.
- `category_pricing`/`channel_pricing` modeled as structured GraphQL types
  (not a raw JSON scalar), a "Pricing Overrides" section on
  `manager/services/{create,edit}.jsx`.
- Tests: 9 pure-function unit tests plus coverage at both real call sites.

## Real finding from this slice — a design decision, not a bug

Research before planning found the genuine risk this slice's whole design
targets: price was read from two independent call sites, which is exactly
the shape of bug that lets a patient see one price and be charged another.
The fix (one shared helper) is architectural, not a late discovery — but
the `channel` semantics needed a real decision: tied to the *payment*
mechanism (`'online'` for Razorpay, `'walkin'` for the new counter-payment
mutation this pass's Slice 5 adds), not the *booking* mechanism, since a
walk-in-booked patient can still pay online and vice versa. Recorded in
`PLAN063` as a deliberate rejection of the more obvious-seeming
booking-mechanism signal.

## Live verification, and one non-bug nuance confirmed

Live-tested against the real dev-seeded "GP Consultation" service and a
real appointment (see `TR089`/`TR090` for the full round-trip, spanning
this slice and Slice 5 together — see `TR090` for the counter-payment
half). Confirmed: overrides persist and read back correctly; the display
call site correctly shows the base price pre-payment; the charge call site
correctly resolves the `'walkin'` rate. Also confirmed (not a defect):
omitting `category_pricing`/`channel_pricing` from an update leaves
existing overrides untouched (Prisma `undefined` semantics, matching this
slice's own documented design) — an explicit empty object (`{}`) is
required to actually clear them, which was used to revert the shared dev
service back to its pre-test state afterward.

## What's deliberately not built yet

`US-CAT-01` (packages) and `US-CAT-05` (price-list audit) — both P1,
untouched. Department picker UI in clinician/service forms (a separate,
earlier slice's own deferral, unrelated to this one) remains deferred.

## Next in this pass

REQ023 (mixed-tender counter billing) — the final slice.
