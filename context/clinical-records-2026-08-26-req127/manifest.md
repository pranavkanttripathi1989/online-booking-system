---
id: CTX-clinical-records-2026-08-26-req127
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ127
related: [PLAN167, TP187, TR187]
---

# clinical-records — REQ127: investigation orders (2026-08-26)

Fourth slice of the next 10-slice batch (`project-plans/analysis/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ127 | [Investigation orders](../../requirements/clinical-records/improvement/REQ127-clinical-records-2026-08-26-investigation-orders.md) |
| implementation-plans | PLAN167 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN167-clinical-records-2026-08-26-investigation-orders.md) |
| test-plans | TP187 | [verification plan](../../test-plans/clinical-records/improvement/TP187-clinical-records-2026-08-26-investigation-orders.md) |
| test-results | TR187 | [verification results — pass](../../test-results/clinical-records/improvement/TR187-clinical-records-2026-08-26-investigation-orders.md) |

## What shipped

`REQ020`'s own P1/P2 deferral list named "investigation orders" as
unbuilt (FR-EMR-08). A new `Encounters.orderInvestigation` mutation
(clinician-only, blocked on a locked/signed encounter) plus an
"Investigations" section on `EncounterWorkspace.jsx`, mirroring the
existing Diagnoses UI exactly.

**Scope correction, found before starting**: this session's own batch
plan described a new `InvestigationOrders` table. Reading the real
`TestResults` schema first changed that — its `status` enum
(`pending → processing → completed`) already models the order→result
lifecycle this story needs, so the slice extends `TestResults` with a
nullable `encounter_id` and an `urgency` column instead of building a
parallel table. The pre-existing standalone `orderTest()` mutation and
lab-result-entry flow are untouched; `encounter_id` is simply null for
rows created that way.

## Verification

Backend: 92/92 unit suites, 1484/1484 tests (4 new); integration 4/4
suites, 387/387 unchanged (new migration applied cleanly via the
integration harness's own `global-setup.ts`). `tsc --noEmit`/`eslint`
clean. Frontend: `EncounterWorkspace.test.jsx` 7/7 (2 new), `eslint`
clean on both touched files with zero new lint-ratchet warnings (used
the `'grey.50'` MUI token instead of a new hex literal).
