---
id: REQ054
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ016
related: [REQ016]
---

# Multi-sitting service packages

## Source

`REQ016`'s own P1 remainder (`US-CAT-01`) — differentiated pricing and
drug/tax depth already shipped; only the `Packages` entity itself remained
open. Also a real prerequisite for `project-plans/technical-plans/
03-phase3-v2.md`'s Phase-3 physio/dental specialty treatment-plan work,
which names `REQ016`'s `Packages` as a dependency — building it now is
correct sequencing, not premature, since a package (e.g. "10 physio
sessions") is useful standalone today, in any specialty, independent of
the Phase-3 encounter-extension work that will later build on it.

## User story

**US-CAT-01** — As an Org Admin at a physiotherapy clinic, I want to sell
a "10-session physio package" at a bundled price, so that a patient pays
once and consumes sessions over time.

- PRD ref: `FR-CAT-03`
- Priority: P1

### Acceptance criteria

- Given a package with 10 sittings and a 90-day validity, when a patient
  books their 3rd session, then the remaining-sittings counter decrements
  and the booking requires no additional payment.
- Given a package's validity window has expired with sittings remaining,
  then no further session can be booked against it, and the front desk
  sees the exact number of forfeited sittings.

## Data-model impact

- `Packages` (client_org_id, clinic_id, name, total_sittings, price_paise,
  validity_days default 90, is_active) — the sellable catalog item.
- `PackageItems` (package_id, product_id) — which service(s)/product(s) a
  sitting from this package may be redeemed against; a package bundles one
  or more, per the story's own wording.
- `PatientPackages` (package_id, patient_id, client_org_id, clinic_id,
  sittings_total, sittings_remaining, purchase_amount_paise, purchased_at,
  expires_at) — a purchased instance. `sittings_total`/`purchase_amount_paise`
  are denormalized from `Packages` at purchase time so a later catalog
  edit never retroactively changes an already-sold package.
- `redeemPackageSitting` — a new sibling mutation on the existing
  `appointment-payments` domain (reuses its private
  `confirmAppointmentIfAwaitingPayment` + webhook dispatch, the same
  transition logic `recordCounterPayment` already uses), not a shoehorned
  zero-amount case through `recordCounterPayment`'s own exact-tender-match
  validation. Records a zero-amount `AppointmentPayments` row
  (`metadata: {package_redemption: true, patient_package_id}`) so existing
  payment-status reporting continues to work for a package-redeemed visit
  without inventing a parallel "paid" concept.
- Decrement pattern copies `DrugBatches.quantity_remaining`'s established
  "read current value, assert enough remains, decrement inside the
  transaction" shape (`REQ022`) — the same class of guarantee, not a new
  invention.
- Pricing: `resolveServicePrice()` is **not** touched — its own contract
  is "resolve a price to charge," and a redemption has no price to
  resolve at all. The caller checks for an active, unexpired
  `PatientPackages` with `sittings_remaining >= 1` *before* ever calling
  it, and skips straight to redemption instead.

## Out of scope (deferred, not silently dropped)

Partial-sitting packages (e.g. "half a session"), package transfer between
patients, refunds on an unused/expired package, and a package "renewal"
flow. Purchase-time payment collection is a single upfront tender
(cash/UPI/card/cheque, matching `PaymentTenders`' own vocabulary) recorded
directly on `PatientPackages`, not a multi-tender split — `REQ023`'s own
mixed-tender machinery is for appointment billing specifically, and a
package purchase is not appointment-scoped.
