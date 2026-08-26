---
id: TR180
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP180
related: []
---

# TR180 — Test results: bulk-reschedule a clinician's day

All 9 `TP180` cases pass.

`npx jest src/appointments/appointments.service.spec.ts --maxWorkers=2`:
80/80 tests pass (6 new).

Full backend unit suite: 92/92 suites, 1470/1470 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no new tenancy-matrix
coverage needed (an additive mutation on an already-covered domain).
`tsc --noEmit`/`eslint` clean on backend; `eslint` clean on
`frontend/src/pages/appointments/index.jsx` (61 pre-existing
`no-hardcoded-colors` warnings on lines untouched by this slice, no new
warnings introduced).

## No dedicated frontend test

No pre-existing `.test.jsx` file exists for `pages/appointments/index.jsx`
(only `edit.test.jsx` exists in this directory); the new dialog was
verified by lint + manual read against the GraphQL contract, matching
this batch's established precedent for pages without existing test
coverage.

## Live verification

Not performed against the real dev stack — the shared `medibook_backend`
container remains mid-flight on unrelated, uncommitted concurrent work
(same noted blocker as the rest of this batch's later slices).
