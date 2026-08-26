---
id: TR130
type: bug
feature: test-results
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP131
related: [BUG027, PLAN104]
---

# TR130 — Results for `orderTest`'s `patient_id` fix (F-08)

Executed 2026-08-25/26 against `medibook_backend`/`medibook_postgres` on
`master`, as part of a 10-finding pick-up from
`project-plans/analysis/02-findings-register.md`.

## Unit

`test-results.service.spec.ts`: 13/13 pass (4 new). Full backend suite:
84/84 suites, 1317/1317 tests. Integration: 4/4 suites, 369/369 tests.
`eslint`/`tsc --noEmit`: clean.

## Frontend

`npm run lint`: 0 new errors (10 pre-existing warnings on the touched
file, unrelated). `npm test`: 5 suites flaky under full-parallel
resource contention (`settings/index`, `patients/detail`,
`EncounterWorkspace`, `booking/index`, `manager/pharmacy/index`), all 5
confirmed passing in isolation — none import
`pages/test-results/index.jsx`. `npm run build`: succeeded.

## Live verification

`orderTest(input: {patient_id: <real patient>, patient: "...", testType:
"Blood Test"})` against the real dev DB — confirmed via direct SQL that
`patient_id` was correctly written on the new row (previously always
`null`). Omitting `patient_id` confirmed rejected by GraphQL schema
validation itself, before reaching the resolver.

## Commits

See the commits immediately following this test-results doc in `git log`.
