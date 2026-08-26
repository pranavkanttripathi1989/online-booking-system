---
id: TR187
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP187
related: []
---

# TR187 — Test results: investigation orders

All 9 `TP187` cases pass.

`npx jest src/encounters/encounters.service.spec.ts --maxWorkers=2`:
42/42 tests pass (4 new).

`npx jest src/pages/clinician/EncounterWorkspace.test.jsx --runInBand`:
7/7 tests pass (2 new).

Full backend unit suite: 92/92 suites, 1484/1484 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — the new
`20260826184000_investigation_orders` migration applied cleanly via the
integration harness's own `global-setup.ts`. `tsc --noEmit`/`eslint`
clean on backend; `eslint` clean on both touched frontend files, with
the new list item's background switched to the `'grey.50'` MUI palette
token specifically to keep the frontend lint-warning count unchanged
from its pre-slice baseline (3 warnings in this file, same as before
this slice — confirmed by diffing warning counts before/after).

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit + mocked-Apollo coverage above exercises the
exact locked-encounter guard, default/explicit urgency, and the
order → refetch → display round trip a live consultation session would
use.
