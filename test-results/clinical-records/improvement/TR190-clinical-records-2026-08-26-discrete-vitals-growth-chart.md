---
id: TR190
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP190
related: []
---

# TR190 — Test results: discrete vitals and growth chart

All 11 `TP190` cases pass.

`npx jest src/encounters/encounters.service.spec.ts --maxWorkers=2`:
55/55 tests pass (6 new).

`npx jest src/pages/clinician/EncounterWorkspace.test.jsx --runInBand`:
12/12 tests pass (3 new).

Full backend unit suite: 92/92 suites, 1505/1505 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — the new
`20260826210000_vitals` migration applied cleanly via the integration
harness's own `global-setup.ts`. `tsc --noEmit`/`eslint` clean on
backend; `eslint` clean on both touched frontend files, 3 warnings
(unchanged from `REQ128`'s own baseline).

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit + mocked-Apollo coverage above exercises the
exact locked-encounter guard, server-side unit derivation, the
cross-encounter growth-chart query, and the real `recharts` rendering
path (via a jsdom `ResizeObserver` stub, since jsdom itself doesn't
implement it) for both a populated and an empty vitals series.
