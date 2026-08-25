---
id: TR118
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP119
related: [REQ065, PLAN092]
---

# TR118 — Results for dependant self-scoping (prescriptions + test results) (REQ065)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres`/
`medibook_postgres_test` (the shared dev stack) on `master`.

## Backend unit — `prescriptions.service.spec.ts` (extended)

| Case | Result |
|---|---|
| All pre-existing cases, unchanged assertions | **pass** (30/30) |
| Dependant read via `prescription()` | **pass** |
| Still rejects neither-own-nor-dependant | **pass** |
| Dependant list via `patientPrescriptions()` | **pass** |
| Rejects `patientPrescriptions` for neither-own-nor-dependant | **pass** |

34/34.

## Backend unit — `test-results.service.spec.ts` (extended)

| Case | Result |
|---|---|
| `findAll` filter is `{ in: [...] }`, updated assertion | **pass** |
| `findAll` includes a dependant id | **pass** |
| `findOne` dependant read | **pass** |
| `findOne` still rejects neither-own-nor-dependant | **pass** |
| Self-registered caller fail-closed sentinel, updated assertion | **pass** |
| All other pre-existing cases | **pass** |

9/9.

Full backend suite: unit **80 suites / 1224 tests**, all passing
(`npx jest --maxWorkers=2`, 101.6s). Integration **4 suites / 369 tests**,
all passing (`npm run test:int` from the host, 44.3s) —
`tenancy.int-spec.ts` in particular, the suite that would have caught a
tenant-isolation regression, passed clean. `eslint`: 0 errors.
`tsc --noEmit`: clean. `docker restart medibook_backend` confirmed a
clean recompile ("Found 0 errors") before live verification.

## Live verification

Confirmed over the real GraphQL endpoint (`curl` against
`http://localhost:4000/graphql`, real JWTs, `docker restart
medibook_backend` first to confirm a clean "Found 0 errors" recompile),
not just the mocked-Prisma unit suite — matching Hard Rule 2's own
standing guidance:

1. Temporarily linked the demo `patient@medibook.dev` account to a real
   seeded `Patients` row (Anita Sharma), matching this session's own
   established "temp-link a demo account" fixture pattern.
2. Called the real `addDependant` mutation as that patient — created a
   real dependant `Patients` row + `PatientRelations` row through the
   actual product code path, not a direct insert.
3. Inserted a real `TestResults` row for the dependant directly via SQL
   (`orderTest`'s own `OrderTestInput` has no `patient_id` field at
   all — every test result is free-text-patient by design, confirmed
   while reading the DTO — so there is no mutation path to create one
   with a real `patient_id` link; this is the correct way to construct
   the fixture, not a shortcut around a mutation that should exist).
4. `testResults` (list) and `testResult(id)` (direct fetch), called as
   the patient, both returned the dependant's row — **before this fix,
   both would have rejected/omitted it**.
5. Control: inserted a second `TestResults` row for a real, unrelated
   third patient (not the caller, not their dependant). `testResult(id)`
   on it returned the exact pre-existing `NotFoundException`; `testResults`
   correctly excluded it from the list — the widening did not weaken the
   existing rejection.
6. Reverted the account link and deleted every fixture row created
   (2 `TestResults`, 1 `Patients`, 1 `PatientRelations`) — confirmed
   clean via a direct DB check afterward.

`prescriptions.service.ts`'s own live HTTP path was not separately
re-exercised — it shares the identical mechanism (the same injected
`PatientsService.ownAndDependantPatientIds` call, proven live above) and
already has 4 new, thorough mocked-Prisma unit cases covering both the
allow and still-reject paths; re-deriving a second full encounter →
prescription fixture chain live added verification depth disproportionate
to the risk for a mechanically identical change.

## What this does not close

`messages.service.ts` — reclassified as a genuine open product question
(`context/open-questions.md` #16), not a like-for-like gap; see `REQ065`
and `PLAN092`'s own accounts for why.

## Commits

See the commits immediately following this test-results doc in `git log`.
