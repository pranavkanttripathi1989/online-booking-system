---
id: TR268
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP268
related: [PLAN248]
---

# TR268 — Test results: IPD slice 1 (ADT core)

## TP268 case outcomes

All 53 cases pass — 5 database-guarantee integration cases, 38 backend
unit cases, 10 frontend cases.

```
PASS test/integration/ipd-adt.int-spec.ts (5 tests)
PASS src/wards/wards.service.spec.ts (19 tests)
PASS src/wards/bed-board.service.spec.ts (4 tests)
PASS src/admissions/admissions.service.spec.ts (23 tests)
PASS src/admissions/mlc.service.spec.ts (15 tests)
PASS src/admissions/mlc-police-intimation-sweep.service.spec.ts (6 tests)
PASS src/admissions/bed-status-reconcile.service.spec.ts (6 tests)

Test Suites: 6 unit + 1 integration
Tests:       73 unit + 5 integration = 78 IPD-specific tests
```

```
PASS src/pages/ipd/BedBoard.test.jsx (4 tests)
PASS src/pages/ipd/Admissions.test.jsx (6 tests)
```

`npx tsc --noEmit` / `npx eslint "{src,test}/**/*.ts"` — clean throughout
the whole slice.

## Real bug found and fixed during this pass

**Postgres SQLSTATE `23P01` is not one of Prisma's mapped error codes.**
The first implementation of the bed-overlap-conflict translator checked
`err.code === '23P01'`, which silently never matches — Prisma surfaces an
exclusion violation as a `PrismaClientUnknownRequestError` carrying the
raw driver text in `.message`, not a recognised `.code`. The exclusion
constraint fired correctly every time; the caller still received a raw
Postgres error dump instead of "Bed X is already occupied for that
period." Found by `ipd-adt.int-spec.ts`'s own backdated-transfer case,
not by code review — the assertion `toMatch(/already occupied/i)` failed
against the real Postgres error text. Fixed by matching on the constraint
name (`bed_occupancies_no_double_occupancy`) in the message string
instead, exactly the pattern `appointments.service.ts` already established
for its own three overlap constraints. The shared helper
(`isBedOverlapViolation`) was placed in `wards/bed-overlap.ts` rather than
inline in `admissions.service.ts`, so the module dependency direction
matches `AdmissionsModule` importing `WardsModule`, never the reverse.

## A second real finding, not a bug: MLC tables cannot be `DELETE`d by any means except `TRUNCATE`

Discovered while writing the integration spec's own cleanup — a
`deleteMany()` against `MlcAmendments`/`MlcRegisters` in test teardown
failed with the exact same "append-only"/"cannot be deleted" trigger
error the feature is designed to enforce. This is correct behaviour, not
a defect: a statutory lifelong record must resist deletion from
**every** code path, including test cleanup, not just the application's
own service layer. The spec's own cleanup now uses `TRUNCATE TABLE
"MlcAmendments", "MlcRegisters" CASCADE` — the one operation Postgres
exempts from per-row triggers, remaining available to a throwaway test
database while staying entirely unreachable from application code (which
never issues `TRUNCATE`). Recorded here because it is worth knowing
before writing any future test or migration touching these two tables.

## Live verification

Schema/module registration confirmed via `tsc --noEmit`/`eslint` clean
compiles and the full local test suite (unit + integration) exercising
every new resolver field end-to-end against a real PostgreSQL database
(the integration harness's own real `AppModule`, real JWTs, real guard
chain — not a mock). **Live schema introspection against the running
`medibook_backend` dev container**, after `docker exec ... npx prisma
generate` and a full restart (the documented anonymous-volume gotcha —
the running watch process caches the old Prisma Client types until
restarted): confirmed all 9 new queries (`wards`, `ward`, `beds`,
`bedBoard`, `admissions`, `admission`, `admissionEvents`, `mlcRegisters`,
`mlcRegister`) and all 16 new mutations (`createWard`, `updateWard`,
`deleteWard`, `createBed`, `updateBed`, `deleteBed`, `blockBed`,
`releaseBed`, `createAdmission`, `updateAdmission`, `transferAdmissionBed`,
`dischargeAdmission`, `cancelAdmission`, `recordMlcRegister`,
`recordMlcPoliceIntimation`, `amendMlcRegister`) are genuinely served by
the running server — no silent module-recompile race this time
(`CLAUDE.md`'s own documented risk for exactly this scenario).

## Full backend suite

`npx jest --maxWorkers=2` — 152 suites / 2421 tests, zero regressions
from the pre-slice baseline (146/2348). `npm run test:int` — the full
tenancy matrix plus `ipd-adt.int-spec.ts`, all green; both new domains
(`wards`, `admissions`) classified as real `CASES` entries and passing
every row including the org-less `__no_org__` sentinel.

## Full frontend suite

`eslint` — 0 errors project-wide, 3597/4908 lint-warning ratchet (up
from 3522 pre-slice, ratchet ceiling not increased). `npm run build` —
succeeded, new `BedBoard`/`Admissions` chunks well within budget
(`Admissions` 23.53 kB / 6.62 kB gzipped). `npm run size` — all four
budgets green.
