---
id: CTX-clinical-records-2026-08-26-req128
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ128
related: [PLAN168, TP188, TR188]
---

# clinical-records — REQ128: referrals (2026-08-26)

Fifth slice of the next 10-slice batch (`project-plans/analysis/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ128 | [Referrals](../../requirements/clinical-records/improvement/REQ128-clinical-records-2026-08-26-referrals.md) |
| implementation-plans | PLAN168 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN168-clinical-records-2026-08-26-referrals.md) |
| test-plans | TP188 | [verification plan](../../test-plans/clinical-records/improvement/TP188-clinical-records-2026-08-26-referrals.md) |
| test-results | TR188 | [verification results — pass](../../test-results/clinical-records/improvement/TR188-clinical-records-2026-08-26-referrals.md) |

## What shipped

`REQ020`'s own P1/P2 deferral list named "referrals" as unbuilt
(FR-EMR-10). A new `Referrals` table plus `Encounters.createReferral`
mutation (clinician-only, blocked on a locked/signed encounter,
Hard-Rule-6-validated when a specific in-org clinician is named) plus a
"Referrals" section on `EncounterWorkspace.jsx`, mirroring the
Diagnoses/Investigations UI exactly. Checked `patients/detail.jsx`'s own
mock "Letters" tab first (its empty state mentions "Referral letters")
and confirmed it's a different, broader, still-paused feature
(`context/open-questions.md` #13) — not touched or conflated with this
slice.

## Verification

Backend: 92/92 unit suites, 1491/1491 tests (7 new); integration 4/4
suites, 387/387 unchanged (new migration applied cleanly via the
integration harness's own `global-setup.ts`). `tsc --noEmit`/`eslint`
clean. Frontend: `EncounterWorkspace.test.jsx` 9/9 (2 new), `eslint`
clean on both touched files, 3 warnings unchanged from `REQ127`'s own
baseline.
