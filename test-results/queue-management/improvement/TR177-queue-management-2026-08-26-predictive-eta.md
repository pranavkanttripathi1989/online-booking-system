---
id: TR177
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP177
related: []
---

# TR177 — Test results: predictive rolling-median ETA

All 7 `TP177` cases pass.

`npx jest src/queue --maxWorkers=2`: 35/35 tests pass (2 new).

Full backend unit suite: 91/91 suites, 1449/1449 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no new tenancy-matrix
coverage needed (an additive field on an already-covered query, no new
domain). `tsc --noEmit`/`eslint` clean on backend; `eslint` clean on
`frontend/src/pages/queue/index.jsx`.

## No dedicated frontend test

No pre-existing `.test.jsx` file exists for `pages/queue/index.jsx`
(confirmed by directory listing before starting); this slice's frontend
change is a two-line additive display, verified by lint + manual read
against the GraphQL contract rather than adding a new test file for an
otherwise-untested page — out of scope for a single-field addition.

## Live verification

Not performed against the real dev stack — the shared `medibook_backend`
container is currently mid-flight on unrelated, uncommitted schema work
from a concurrent session (see `REQ116`'s own `TR176` for the same
noted blocker), so a live restart was deliberately avoided.
