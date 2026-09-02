---
id: CTX-ipd-2026-09-02-req183-tpa-cashless-insurance
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ183
related: [PLAN252, TP272, TR272, REQ179, REQ180, REQ181, REQ182]
---

# ipd — slice 5: TPA cashless insurance (2026-09-02) — plan complete

**Final slice of the 5-slice IPD plan** approved alongside slice 1
(`REQ179`, `context/ipd-2026-09-02-req179/manifest.md`) and built
directly on slice 4's billing ledger (`REQ182`,
`context/ipd-2026-09-02-req182-billing-ledger/manifest.md`) —
core-first sequencing throughout. Triggered by a bare `continue` after
slice 4 shipped, tested, documented, and was pushed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ183 | [doc](../../requirements/ipd/requirement/REQ183-ipd-2026-09-02-tpa-cashless-insurance.md) |
| implementation-plans | PLAN252 | [doc](../../implementation-plans/ipd/requirement/PLAN252-ipd-2026-09-02-tpa-cashless-insurance.md) |
| test-plans | TP272 | [doc](../../test-plans/ipd/requirement/TP272-ipd-2026-09-02-tpa-cashless-insurance.md) |
| test-results | TR272 | [doc](../../test-results/ipd/requirement/TR272-ipd-2026-09-02-tpa-cashless-insurance.md) |

## What shipped

- **New `backend/src/ipd-insurance/` module**: `PreAuthorizations`
  (nullable+unique `admission_id` — requested days before an admission
  exists, bound later via a dedicated mutation), `PreAuthEnhancements`
  (server-side-snapshotted bill amount at request time), `IpdClaims`
  (one per admission), `IpdClaimDeductions` (line-level disallowance —
  the thing the pre-existing OPD `Claims` model structurally cannot
  express), `IpdInsuranceDocuments` (REST upload + GraphQL metadata).
  A 4-hourly `PreAuthUtilizationSweepService` notifies the insurance
  desk at 80% authorization utilization.
- **`settleIpdClaim` reuses `IpdBillingService#recordPayment()`
  verbatim** — the real payer payout posts as a genuine `IpdPayments`
  row against the actual bill, closing the loop back to slice 4's own
  ledger.
- **Frontend**: `pages/ipd/IpdInsurance.jsx`, two tabs
  (Pre-Authorizations, Claims), full lifecycle UI, reachable via nav and
  a deep-link from the admissions detail dialog.

## Two real bugs found and fixed this slice

1. **A missing `JwtService` provider** — `ipd-insurance.module.ts`'s
   first draft omitted `AuthModule`, crashing the container on boot.
   Fixed by importing it, matching `encounters.module.ts`/`messages
   .module.ts`'s own established pattern for a REST attachments
   controller.
2. **A genuine race condition**, found by re-reading the code against
   the plan's own stated gate before writing the integration test —
   `bindPreAuthorizationToAdmission`'s original read-then-write let two
   concurrent binds of the same pre-auth to two different admissions
   silently clobber each other with no error. Fixed with a single
   atomic `UPDATE ... WHERE admission_id IS NULL`, live-proven under
   real concurrency in `ipd-insurance.int-spec.ts`. Full account in
   `PLAN252`.

## Deliberately NOT built in this slice (recorded, not silently dropped)

Real payer/NHCX API integration or auto-submission — every state
transition is a human decision, per the plan's own confirmed design.
Government-scheme claim workflows (PMJAY/CGHS). `IpdClaimAppeals` —
explicitly cut in the original plan.

## Verification

Backend: 53 new unit tests, full suite 166 suites/2637 tests,
`tsc`/`eslint` clean. Integration: `ipd-insurance.int-spec.ts` 5/5
gates (including the real bind-race fix proven under genuine
concurrency, and a live confirmation that `Payers`/`PayerTariffs`/
`PayerEmpanelments`/`PatientInsurancePolicies` have zero schema drift),
full suite 13/13 suites, 516/516 tests, `matrix-coverage.int-spec.ts`
green with a new `ipd-insurance` `CASES` entry. Live schema
introspection confirmed every new query/mutation genuinely served.
Frontend: build/lint/size-limit green, 2/2 new tests.

## Commits

`8c00680` (backend), `b9e6067` (backend tests), `ef8901c` (frontend).

## The 5-slice IPD plan is now complete

`REQ179` (ADT core: admissions, wards, beds, live bed board, MLC
register) → `REQ180` (nursing charting, medication orders, MAR,
discharge summary) → `REQ181` (operation theatre scheduling) → `REQ182`
(billing ledger, room-day accrual, package settlement) → `REQ183` (TPA
cashless insurance) — approved via `ExitPlanMode` at the very start,
overriding both PRD documents' stated "IPD/ward management out of
scope" position (recorded in `REQ179`/`PLAN248`), and built core-first
with each slice its own fully reviewed, tested, documented, and pushed
checkpoint before the next began.
