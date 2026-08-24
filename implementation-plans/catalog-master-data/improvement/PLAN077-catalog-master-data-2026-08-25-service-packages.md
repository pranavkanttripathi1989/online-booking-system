---
id: PLAN077
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ054
related: [REQ016]
---

# PLAN077 — Implementation plan: multi-sitting service packages

## Scope

`REQ054` (`US-CAT-01`, `REQ016`'s own P1 remainder) — a sellable
multi-sitting bundle: purchase once, redeem sittings across future
appointments with no additional payment, until sittings run out or the
purchase's validity window expires.

## Design

Three new models: `Packages` (the catalog item — `total_sittings`,
`price_paise`, `validity_days` default 90), `PackageItems` (which
service(s)/product(s) a sitting may redeem against — a package bundles one
or more, per the story's own wording), `PatientPackages` (a purchased
instance — `sittings_total`/`purchase_amount_paise` **denormalized** from
`Packages` at purchase time, so a later catalog edit never retroactively
changes an already-sold package).

New top-level `backend/src/packages/` module (scaffolded like `checklist`/
`intake-fields`) owns the catalog CRUD (`createPackage`/`updatePackage`/
`deletePackage`) and purchase (`purchasePackage` — a single upfront tender,
matching `PaymentTenders`' own cash/UPI/card/cheque vocabulary; **not**
`REQ023`'s multi-tender split, since that machinery is for appointment
billing specifically and a package purchase is not appointment-scoped).

`packages()`'s `clinic_id` argument is optional, matching the same fix
applied in `REQ051`/`REQ052`: omitted, it lists every active package
across the caller's own org (the shape the tenancy matrix needs to serve
org-A/org-B actors from one shared query) — applied proactively this time,
having learned the pattern from the earlier two slices' own test failures,
rather than rediscovering it a third time.

**`redeemPackageSitting` is a new sibling mutation on the existing
`appointment-payments` domain**, not a new mutation on the `packages`
module and not a shoehorned zero-amount case through `recordCounterPayment`
— that method's own "tenders must sum to exactly the amount due" validation
has no meaning for a redemption (there is no amount due). It reuses
`confirmAppointmentIfAwaitingPayment` and the `payment.succeeded` webhook
dispatch, the same transition logic `recordCounterPayment` already uses,
and records a **zero-amount** `AppointmentPayments` row (`metadata:
{package_redemption: true, patient_package_id}`) so existing
payment-status reporting keeps working for a package-redeemed visit
without inventing a parallel "paid" concept.

**`resolveServicePrice()` is deliberately never called for a redemption**
— its own contract is "resolve a price to charge," and a redemption has
no price to resolve at all. The caller checks for an active, unexpired
`PatientPackages` with `sittings_remaining >= 1` before ever reaching
pricing logic, and skips straight to redemption.

Decrement pattern copies `DrugBatches.quantity_remaining`'s established
shape (`REQ022`) exactly: read the current value, assert enough remains,
decrement inside the same transaction as the triggering write — re-checked
inside the transaction itself (not just the pre-check) to close the same
race a concurrent double-redemption could otherwise exploit.

## Testing

`packages.service.spec.ts` (new, 21 cases): list (in-scope clinic,
cross-org clinic returns `[]`, no-clinic-id org-wide path for both org A
and org B), create (in-scope, cross-org clinic, clinic with no
organization to anchor to, a product from a different clinic, a
nonexistent product, the transaction creating both `Packages` and
`PackageItems`), update/remove (cross-org rejected), purchase (cross-org
package, inactive package, nonexistent patient, denormalized
sittings/amount + 90-day expiry math), `patientPackages` (org-scoped,
`is_expired` computed correctly).

`appointment-payments.service.spec.ts` — 8 new cases in a
`redeemPackageSitting` describe block: nonexistent appointment, cross-org
appointment, nonexistent package, cross-org package, a package belonging
to a different patient than the appointment, an expired package, no
sittings remaining (transaction never starts), and the full happy path
(decrement + zero-amount succeeded payment + correct return shape).

`packages` added to `matrix-coverage.int-spec.ts`'s `CASES` (a real,
covered domain — not `EXEMPT` — using the same no-args shape as
`checklist`/`intake-fields`).

Full suite: backend unit — 78/78 suites, 1141/1141 tests (was 77/1116
after `REQ053`). `npm run test:int` (from host) — 4/4 suites, 342/342
tests (was 333). `eslint`/`tsc --noEmit` clean. Unlike the prior three
slices, **no real bugs were found this pass** — the design held on the
first implementation, likely because the two established fix patterns
(optional `clinic_id` for tenancy-matrix compatibility, and the
`isPlatformOperator`/`isSameOrg` semantics) were applied proactively from
the start rather than discovered via a failing test.

## Out of scope (deferred, not silently dropped)

Partial-sitting packages, package transfer between patients, refunds on
an unused/expired package, a package "renewal" flow, and multi-tender
purchase collection. Frontend UI (backend-only, per this batch's confirmed
direction).
