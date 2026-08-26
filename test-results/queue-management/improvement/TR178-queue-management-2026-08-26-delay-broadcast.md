---
id: TR178
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP178
related: []
---

# TR178 — Test results: delay broadcast to waiting patients

All 8 `TP178` cases pass.

`npx jest src/queue --maxWorkers=2`: 39/39 tests pass (4 new).
`npx jest src/notifications/notification-trigger --maxWorkers=2`:
24/24 tests pass, unaffected by the new `DEFAULTS` entry.

Full backend unit suite: 91/91 suites, 1453/1453 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no new tenancy-matrix
coverage needed (an additive mutation on an already-covered domain).
`tsc --noEmit`/`eslint` clean on backend; `eslint` clean on
`frontend/src/pages/queue/index.jsx`.

## No dedicated frontend test

No pre-existing `.test.jsx` file exists for `pages/queue/index.jsx`
(same as noted in `REQ117`'s own `TR177`); the dialog was verified by
lint + manual read against the GraphQL contract, matching that
precedent.

## Live verification

Not performed against the real dev stack — the shared `medibook_backend`
container remains mid-flight on unrelated, uncommitted schema work from
a concurrent session (same noted blocker as `REQ116`/`REQ117`).
