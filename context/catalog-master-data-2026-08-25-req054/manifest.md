---
id: CTX-catalog-master-data-2026-08-25-req054
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ054
related: [REQ016, PLAN077, TP104, TR103]
---

# catalog-master-data — REQ054: multi-sitting service packages (2026-08-25)

Fourth slice in the 8-slice batch picked from `project-plans/` this
session (research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ054 | [multi-sitting service packages](../../requirements/catalog-master-data/improvement/REQ054-catalog-master-data-2026-08-25-service-packages.md) |
| implementation-plans | PLAN077 | [implementation plan](../../implementation-plans/catalog-master-data/improvement/PLAN077-catalog-master-data-2026-08-25-service-packages.md) |
| test-plans | TP104 | [verification plan](../../test-plans/catalog-master-data/improvement/TP104-catalog-master-data-2026-08-25-service-packages.md) |
| test-results | TR103 | [verification results — pass, 78/78 + 4/4 suites](../../test-results/catalog-master-data/improvement/TR103-catalog-master-data-2026-08-25-service-packages.md) |

## What shipped

`Packages`/`PackageItems`/`PatientPackages` (new `backend/src/packages/`
module) — purchase-once, redeem-over-time bundles. `redeemPackageSitting`
lives as a sibling mutation on the existing `appointment-payments` domain
(reuses its private transition/webhook logic) rather than a shoehorned
zero-amount case through `recordCounterPayment`. Decrement pattern copies
`DrugBatches.quantity_remaining`'s established shape (`REQ022`) exactly.

## A genuinely quiet slice — no real bugs found

Unlike the prior three slices (`REQ051`–`REQ053`, each of which surfaced
at least one real design or test issue), this one held on the first
implementation pass. Both fix patterns learned earlier in this batch — an
optional `clinic_id` argument for tenancy-matrix compatibility, and the
`isPlatformOperator`/`isSameOrg` cross-org semantics — were applied
proactively from the start. Full account in `PLAN077`.

## Verification

Backend unit: 78/78 suites, 1141/1141 tests (was 77/1116). Integration
(from host): 4/4 suites, 342/342 tests (was 333), including a new
`packages` tenancy-matrix `CASES` row (not `EXEMPT` — a real, covered,
org-scoped domain). `eslint`/`tsc --noEmit` clean.
