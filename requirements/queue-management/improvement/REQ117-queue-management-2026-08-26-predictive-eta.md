---
id: REQ117
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ019
related: [PLAN157, TP177, TR177]
---

# REQ117 — Predictive rolling-median wait-time ETA (US-QUE-04)

## Why this slice

`REQ019` shipped `queueBoard`'s `average_wait_minutes` with an explicit
deferral in its own code comment: *"Deliberately not a predictive ETA
(US-QUE-04, P1 — that needs a rolling median across many days, this is
today-only)."* `project-plans/analysis/11-next-10-slice-batch.md` picked up
exactly that deferred story.

Investigated the existing `queueBoard()` query before scoping: it
already fetched today's `'done'` entries with `checked_in_at`/
`called_at` to compute a same-day mean. Widening the same query's date
filter to a trailing window and computing a median instead of a mean
(median is not skewed by one unusually long consultation) needed no new
table and no schema change — a genuinely additive, low-risk extension of
already-proven code.

## User story

As a patient who just checked in, I want to see a wait estimate that
reflects this clinician's typical pace over the last couple of weeks,
not just what happened earlier today (which could be an unusually
quiet or busy day) — so front desk can set expectations before I've sat
down.

## Acceptance criteria

- **Given** a clinician's queue board, **when** `queueBoard` is queried,
  **then** a new `predicted_wait_minutes` field returns the median wait
  time (`called_at - checked_in_at`) across their `'done'` entries from
  the trailing 14 days.
- **Given** no completed visits exist in that window, **then**
  `predicted_wait_minutes` is `undefined` (an honest empty state, not a
  fabricated `0`).
- **Given** the existing `average_wait_minutes` (today-only, retrospective),
  **then** it is unchanged in meaning and continues to be computed
  correctly — this slice adds a field, it does not replace one, since
  staff watching today's own pace and a patient wanting a predictive
  figure are two different, both-real needs.

## In scope

- `predicted_wait_minutes` on `QueueBoardType`/`queueBoard()`.
- Frontend: `pages/queue/index.jsx` displays the new figure alongside
  the existing today-only average.

## Deliberately out of scope

- Per-position ETA for each waiting patient (a bigger feature — the
  median here is a single clinician-level figure, not "your specific
  wait is X minutes given you're 3rd in line").
- Any change to how `average_wait_minutes` is computed or its meaning.
