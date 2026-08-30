---
id: TR258
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: TP258
related: [BUG063, PLAN238, TP258]
---

# TR258 — test results for BUG063 fixes

Commit: `f80a07f`

| Case | Result |
|---|---|
| `manager/clinics/index.test.jsx` — real empty result shows real empty state, never CLINICS_DATA | PASS (new) |
| `manager/clinics/index.test.jsx` — genuine error falls back to sample data with banner | PASS (new) |
| `manager/clinics/index.test.jsx` — real fetched clinic renders correctly | PASS (new) |
| `manager/resources/index.test.jsx` — manager sees resource + all write controls | PASS (new) |
| `manager/resources/index.test.jsx` — staff sees resource, no write controls (SEC-18) | PASS (new) |
| `manager/packages/index.test.jsx` — staff sees package, no write controls (SEC-18) | PASS (new) |
| `manager/packages/index.test.jsx` — 3 pre-existing cases | PASS, no regression |
| `manager/memberships/index.test.jsx` — staff sees plan, no write controls (SEC-18) | PASS (new) |
| `manager/memberships/index.test.jsx` — 3 pre-existing cases | PASS, no regression |
| Full `src/pages/manager` + `src/layouts/AppShell` suite | 14/14 suites, 57/57 tests (`--maxWorkers=1`) |
| `eslint` on every touched file | 0 errors |
| `npm run build` | succeeded |
| Full `npm run lint` | 0 errors, 3398 warnings (ratchet ceiling 4908) |

`manager/claims/index.test.jsx` and `manager/imports/index.test.jsx`
each flaked once under `--maxWorkers=2` parallel contention during the
full sweep and passed cleanly alone (12/12 tests) — confirmed
pre-existing, unrelated to this change (neither file was touched, and
both match this repo's own documented contention-flakiness pattern).

This closes the "check on the manager pages audit" request: `BUG058`'s
own manager-page sweep is now confirmed to have missed 3 files
entirely and never ran a systematic RBAC cross-check across all 27
manager routes (only spot-checked 3). Both gaps are now closed.
