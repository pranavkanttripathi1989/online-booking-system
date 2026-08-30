---
id: TR253
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: TP253
related: [BUG058, PLAN233, TP253]
---

# TR253 — test results for BUG058 fixes

Commit: `b7983cd`

| Case | Result |
|---|---|
| `manager/clinics/edit.test.jsx` — real clinic renders real values | PASS |
| `manager/clinics/edit.test.jsx` — `clinic: null` shows not-found, never `DEFAULT_MOCK_CLINIC` | PASS |
| `manager/products/edit.test.jsx` — real product renders real values | PASS |
| `manager/products/edit.test.jsx` — `product: null` shows not-found, never `DEFAULT_MOCK_PRODUCT` | PASS |
| Full `frontend/src/pages/manager` Jest suite | 11 suites / 49 tests, all PASS (no regression) |
| `eslint` on the 4 touched files | 0 errors (pre-existing i18n warnings only, unrelated) |
| `npm run build` | succeeded |

All 4 new tests pass; no regressions in the existing manager suite.
