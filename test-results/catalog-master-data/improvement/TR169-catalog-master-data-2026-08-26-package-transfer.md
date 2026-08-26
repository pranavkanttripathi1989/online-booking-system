---
id: TR169
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP169
related: [PLAN150]
---

# TR169 — Test results: package transfer between patients

## TP169 case outcomes

All 12 cases pass. `packages.service.spec.ts` gained a `transferPackage
(REQ110)` describe block (cases 1–7) plus one regression case for the
pre-existing `patientPackages()` scoping bug (case 8):

```
PASS src/packages/packages.service.spec.ts

Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

`npx tsc --noEmit` — clean.

Frontend (`patients/detail.test.jsx`, cases 9–12 — a new "Packages tab
(REQ110)" describe block):

```
PASS src/pages/patients/detail.test.jsx

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

`npx eslint src/pages/patients/detail.jsx src/pages/patients/detail.test.jsx`
— 0 errors (19 pre-existing hex-color warnings on `detail.jsx`, none new;
0 warnings on the test file).

## A real, pre-existing tenant-scoping bug found and fixed while extending `patientPackages()`

`packages.service.ts`'s existing `patientPackages()` method used
`user.client_org_id ? { client_org_id: user.client_org_id } : {}` — the
exact F-01/BUG004 spelling `CLAUDE.md` documents as bug class #1: for an
org-less caller (a platform `admin`/`super_admin`), the ternary's `{}`
branch spreads to **no filter at all**, meaning "see every org's
packages," not "see none." Fixed using `isPlatformOperator()` and the
`'__no_org__'` sentinel pattern already established for every other
domain's self-scoping. A regression test (case 8) pins the correct
behaviour: a platform-operator caller sees rows across orgs (the
intentional default for that role, per `CLAUDE.md`'s "org-less caller
generally sees everything" convention); an org-scoped caller with no
linked org is scoped to zero rows via the sentinel, never unscoped.

## A real, adjacent accessibility gap found and closed proactively

While building the disabled Transfer action for a fully-redeemed/expired
package, applied this codebase's own already-documented Phase G+3
finding ("a Tooltip with no `aria-label` on an icon-only button has no
accessible name at all") before it could recur a fourth time: the new
`IconButton` carries an explicit `aria-label={`Transfer ${package name}`}`
alongside its `Tooltip`, not the `Tooltip` alone.

## New database object

`PackageTransferLog` (migration
`20260826176000_package_transfer_log`) — append-only, matching
`StockMovements`' precedent (`REQ022`) rather than this codebase's
"no generic domain-action audit log" convention (`REQ056`'s own note).
Deployed to the real dev database via `npx prisma migrate deploy`;
`npx prisma generate` + `docker restart medibook_backend` completed
clean ("Found 0 errors").

## Live verification

Not performed against the real dev stack this slice (no browser
automation tool available this session, same honestly-logged gap as
`REQ072`/`TR125`) — confirmed instead via the full mocked-Prisma unit
suite (backend) and `MockedProvider`-backed component tests (frontend),
both exercising the real GraphQL contract shapes end to end at the
test-tooling layer.

## Full consolidated suite

Deferred to the batch-final consolidated run per this batch's own
established discipline (`project-plans/10-next-14-slice-batch-reconciled.md`
"Execution discipline") — this slice's own scoped backend + frontend
suites are green as recorded above.
