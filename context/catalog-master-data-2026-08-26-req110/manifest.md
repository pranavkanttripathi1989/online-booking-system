---
id: CTX-catalog-master-data-2026-08-26-req110
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ110
related: [PLAN150, TP169, TR169]
---

# catalog-master-data — REQ110: package transfer between patients (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/analysis/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ110 | [package transfer between patients](../../requirements/catalog-master-data/improvement/REQ110-catalog-master-data-2026-08-26-package-transfer.md) |
| implementation-plans | PLAN150 | [implementation plan](../../implementation-plans/catalog-master-data/improvement/PLAN150-catalog-master-data-2026-08-26-package-transfer.md) |
| test-plans | TP169 | [verification plan](../../test-plans/catalog-master-data/improvement/TP169-catalog-master-data-2026-08-26-package-transfer.md) |
| test-results | TR169 | [verification results — pass](../../test-results/catalog-master-data/improvement/TR169-catalog-master-data-2026-08-26-package-transfer.md) |

## What shipped

`REQ054` (multi-sitting packages) deliberately deferred transfer/refund/
renewal. This slice builds transfer only: a new append-only
`PackageTransferLog` table (migration `20260826176000_package_transfer_log`),
a `transferPackage` mutation on `packages.resolver.ts` (same
`{success, userErrors, patientPackage}` shape as the existing
`purchasePackage`), and a new "Packages" tab on `patients/detail.jsx`
(the page had no view of a patient's *purchased* packages outside the
appointment-checkout redeem flow) — a table of purchased packages with
remaining sittings and a Transfer action opening a dialog with the
shared patient-search `Autocomplete`.

## A real, pre-existing tenant-scoping bug found and fixed

`PackagesService#patientPackages()` used the banned
`user.client_org_id ? {...} : {}` ternary (F-01/BUG004's bug class) —
an org-less caller saw every org's patient packages, not none. Fixed
using `isPlatformOperator()`/the `'__no_org__'` sentinel, with a
regression test.

## A real, adjacent accessibility gap closed proactively

Applied this codebase's own already-documented Phase G+3 finding
("Tooltip with no `aria-label` has no accessible name") before writing
the disabled Transfer button, rather than after a fourth instance was
found — the new `IconButton` carries an explicit `aria-label`.

## Deliberate deviation from the plan

No new Playwright e2e spec — no browser-automation tool was available
this session (same honestly-logged gap as `REQ072`/`TR125`). Coverage
comes from `packages.service.spec.ts` (backend) and
`patients/detail.test.jsx` (frontend, `MockedProvider`), both exercising
the real GraphQL contract shapes.

## Verification

Backend: `packages.service.spec.ts` 27/27 (7 new + 1 regression),
`tsc --noEmit` clean. Frontend: `patients/detail.test.jsx` 7/7 (4 new),
`eslint` 0 errors on both touched files. Full consolidated suite
deferred to the batch-final run per this batch's established discipline.
