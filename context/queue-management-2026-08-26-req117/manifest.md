---
id: CTX-queue-management-2026-08-26-req117
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ117
related: [PLAN157, TP177, TR177]
---

# queue-management — REQ117: predictive rolling-median ETA (2026-08-26)

Fourth slice of the next 10-slice batch (`project-plans/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ117 | [Predictive rolling-median ETA](../../requirements/queue-management/improvement/REQ117-queue-management-2026-08-26-predictive-eta.md) |
| implementation-plans | PLAN157 | [implementation plan](../../implementation-plans/queue-management/improvement/PLAN157-queue-management-2026-08-26-predictive-eta.md) |
| test-plans | TP177 | [verification plan](../../test-plans/queue-management/improvement/TP177-queue-management-2026-08-26-predictive-eta.md) |
| test-results | TR177 | [verification results — pass](../../test-results/queue-management/improvement/TR177-queue-management-2026-08-26-predictive-eta.md) |

## What shipped

`REQ019`'s own deferred `US-QUE-04` story: `queueBoard()` now returns
`predicted_wait_minutes`, a rolling median across the trailing 14 days
of completed visits, alongside the unchanged today-only
`average_wait_minutes`. No new table — an additive extension of the
already-proven query. `pages/queue/index.jsx` displays it.

Found and fixed a real fixture bug in the process: the existing
`queueBoard` unit test used a fixed calendar date (`2026-08-24`) for its
"today" entry, which silently stopped being "today" once run on a later
date — the exact timezone/fixed-date fixture class CLAUDE.md already
documents elsewhere. Fixed to anchor to `Date.now()` minus a few hours.

## Verification

Backend: 91/91 unit suites, 1449/1449 tests (2 new); integration 4/4
suites, 387/387 unchanged. `tsc --noEmit`/`eslint` clean. Frontend:
`eslint` clean on the touched file; no dedicated test file existed for
this page before this slice. Live verification not performed — shared
dev backend mid-flight on unrelated concurrent work.
