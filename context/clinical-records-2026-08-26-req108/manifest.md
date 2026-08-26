---
id: CTX-clinical-records-2026-08-26-req108
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ108
related: [PLAN148, TP172, TR172]
---

# clinical-records — REQ108: validated ICD-10 coding for diagnoses (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).
`REQ020`'s own long-deferred P1 residue (FR-EMR-03).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ108 | [ICD-10 diagnosis coding](../../requirements/clinical-records/improvement/REQ108-clinical-records-2026-08-26-icd10-diagnosis-coding.md) |
| implementation-plans | PLAN148 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN148-clinical-records-2026-08-26-icd10-diagnosis-coding.md) |
| test-plans | TP172 | [verification plan](../../test-plans/clinical-records/improvement/TP172-clinical-records-2026-08-26-icd10-diagnosis-coding.md) |
| test-results | TR172 | [verification results — pass](../../test-results/clinical-records/improvement/TR172-clinical-records-2026-08-26-icd10-diagnosis-coding.md) |

## What shipped

New platform-global `Icd10Codes` reference table (102 curated,
OPD-relevant real WHO ICD-10 codes — not the full ~14,000+ set), seeded
via `prisma/seed.ts`. New ungated `icd10Codes(search)` query on the
existing `lookups` module (matching `clinicianTypes`/`roomTypes`'
convention). `Diagnoses.icd10_code` stays free `String?` — soft
validation only, per the requirement's own scope decision.
`EncounterWorkspace.jsx`'s "Add Diagnosis" dialog's ICD-10 field is now
an MUI `Autocomplete` (`freeSolo`) with a 300ms-debounced type-ahead
search, replacing the bare `TextField`.

## A real correction to the plan's own seeding approach

The plan suggested raw `INSERT` statements inside the migration file —
no other migration in this codebase does that. Matched the real,
established convention instead (`prisma/seed.ts`'s idempotent
find-then-create loop, the same shape `Drugs`/`SubscriptionPlans` use).

## A real bug found and fixed via the new frontend test

The `Autocomplete`'s `onInputChange` unconditionally overwrote
`diagnosisForm.icd10_code` with raw input text — including MUI's own
post-selection sync of the input box to the option's full rendered
label, so selecting a real code stored the entire label string, not
the bare code. Fixed by gating that write on `reason === 'input'`
(real typing only), verified by the new test that first caught it via
a mock-mismatch diagnostic.

## Deliberate deviations

No new e2e Playwright spec / no live GraphQL verification — no
browser-automation tool available this session (same gap as
`REQ072`/`REQ106`/`REQ107`/`REQ110` earlier in this batch). A real
Postgres seed run confirmed all 102 rows insert cleanly and
idempotently instead.

## Verification

Backend: 90/90 unit suites, 1424/1424 tests (5 new); `tsc --noEmit` and
`eslint` clean. Integration: 4/4 suites, 387/387 tests (unchanged —
`lookups` already `EXEMPT`). Frontend: `npm run lint` exits 0, `npm run
build` succeeds, unit suite 142/143 (1 confirmed pre-existing
full-parallel flake, 7/7 in isolation).
