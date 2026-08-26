---
id: PLAN157
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ117
related: [TP177, TR177]
---

# PLAN157 — Implementation plan: predictive rolling-median ETA

## Change

**`backend/src/queue/queue.service.ts`**:

- New `ETA_WINDOW_DAYS = 14` constant and a `median()` helper.
- `queueBoard()`'s single "done entries" query widened from
  `checked_in_at >= todayStart` to `checked_in_at >= windowStart`
  (today minus 14 days) — one query now serves both figures, filtered
  in application code: `todayWaits` (checked_in_at >= todayStart) feeds
  the unchanged `average_wait_minutes`; the full `windowWaits` array
  feeds the new `predicted_wait_minutes` via `median()`.
- No new Prisma query, no schema change — `QueueEntries` already has
  every column needed.

**`backend/src/queue/entities/queue.entity.ts`**: new
`predicted_wait_minutes?: number` (nullable `Int`) on `QueueBoardType`.

**`frontend/src/pages/queue/index.jsx`**: `QUEUE_BOARD_QUERY` requests
the new field; a second `Typography` line under the existing "Average
wait today" caption shows "Predicted wait (last 14 days): N min" when
present.

## Testing

`backend/src/queue/queue.service.spec.ts`: updated the existing
today-average test to use a `Date.now()`-anchored fixture instead of a
fixed calendar date (the fixed `2026-08-24` date would have silently
fallen outside "today" once run on 2026-08-26 — the exact fixture class
CLAUDE.md already documents as a recurring gap on this host). Added two
new cases: predicted median diverges correctly from the today-only
average given a today entry and a 3-days-ago entry (median of [10, 20]
= 15, average = 10); predicted_wait_minutes is `undefined` with no
completed visits in the window.

Full backend unit suite: 91/91 suites, 1449/1449 tests (2 new).
Integration suite: 4/4 suites, 387/387 tests unchanged. `tsc --noEmit`/
`eslint` clean on both backend and the touched frontend file.

## Documentation

`REQ117` (this requirement), `PLAN157` (this plan), `TP177`/`TR177`
(verification), a context bundle, and index updates across all five doc
roots plus the `queue-management` feature README.
