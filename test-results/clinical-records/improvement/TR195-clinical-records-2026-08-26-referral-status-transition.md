---
id: TR195
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP195
related: []
---

# TR195 — Test results: referral status-transition mutation

All 14 `TP195` cases pass.

`npx jest src/encounters/encounters.service.spec.ts --maxWorkers=2`:
64/64 tests pass (9 new).

`npx jest src/pages/clinician/EncounterWorkspace.test.jsx --runInBand`:
15/15 tests pass (3 new).

Full backend unit suite: 92/92 suites, 1539/1539 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no schema change this
slice, no tenancy-matrix fixture touch needed. `tsc --noEmit`/`eslint`
clean on backend; `eslint` clean on all touched frontend files (3
warnings, unchanged from baseline); full `npm run lint` unchanged at
1909.

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit + mocked-Apollo coverage above exercises the
full state-machine transition matrix (every legal and illegal move) and
the real button-driven mutation → refetch → new-buttons round trip a
live consultation session would use.
