---
id: TR175
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP175
related: []
---

# TR175 — Test results: Sell a Package UI

All 5 `TP175` cases pass.

`frontend/src/pages/patients/detail.test.jsx`: 8/8 tests pass (7
pre-existing + 1 new "sells a package to this patient via the real
purchasePackage mutation (REQ115)"), full file re-run, no regressions.

`eslint src/pages/patients/detail.jsx src/pages/patients/detail.test.jsx`:
0 errors, 19 warnings — all pre-existing `no-hardcoded-colors` warnings
on lines untouched by this slice, no new warnings introduced.

## No backend change

`purchasePackage` (REQ054) is unchanged — this slice is frontend-only.
No backend test run was needed; not run here.

## Live verification

Not performed against the real dev stack this session (no browser tool
available, matching this session's own honest-gap convention e.g.
`REQ072`'s `TR125`). The mocked-Apollo test above exercises the exact
same query/mutation shapes and dialog flow a live session would.
