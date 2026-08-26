---
id: TR185
type: improvement
feature: pharmacy
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP185
related: []
---

# TR185 — Test results: FEFO default on the dispense batch picker

All 6 `TP185` cases pass.

`npx jest src/pages/manager/pharmacy/index.test.jsx --silent`: 6/6
tests pass (1 new — "defaults the batch picker to the earliest-expiring
batch (FEFO)").

`npx eslint src/pages/manager/pharmacy/index.jsx
src/pages/manager/pharmacy/index.test.jsx`: 0 warnings, 0 errors on both.

## No backend change

`PharmacyService#findBatches()`'s `orderBy: {expiry_date: 'asc'}`
already existed from `REQ022` — this slice is frontend-only. Backend
unit/integration suites were not re-run for this slice specifically
(no backend file touched); the batch's overall consolidated pass at the
end of this 10-slice batch will confirm nothing else regressed.

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The mocked-Apollo test exercises the exact default-
selection logic and mutation call a live dispense would use.
