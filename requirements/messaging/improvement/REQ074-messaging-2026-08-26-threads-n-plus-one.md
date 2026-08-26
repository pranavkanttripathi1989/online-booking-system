---
id: REQ074
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# REQ074 — `threads()` N+1 fix, and a scope correction to F-15

## Source

`project-plans/analysis/02-findings-register.md` F-15, part of a 10-finding
pick-up. Re-verification before starting found the finding **mostly
already closed** by unrelated later work — only one of its four named
instances was still real.

## Re-scoped: what was actually still open

- `public.service.ts`'s clinician rating fan-out — **already fixed**.
  `ratingsFor()` uses a single `reviews.groupBy({by:['clinician_id']})`
  for every clinician id at once.
- `dashboard.service.ts`/`analytics.service.ts`'s utilisation walk —
  **not a bug**. `analytics.service.ts#computeTrueUtilisation()` already
  carries its own comment distinguishing this from N+1: each in-scope
  clinician's data is fetched once via `include`, then a bounded
  calendar window is walked in memory. The top-level dashboard summary
  numbers are real `count()`/`Promise.all` aggregates.
- `appointment-payments.service.ts:230`'s original line reference no
  longer points at a loop-with-a-query-inside at all in the current
  file.
- `messages.service.ts#threads()` — **the one real, still-open
  instance**. `toGraphQL()`'s own `participantsFor()` call issued one
  `messageParticipants.findMany` per thread when listing all of a
  caller's threads.

## Fix

`participantsFor()` gained an optional `preloaded` map parameter — when
present, uses the pre-fetched rows instead of its own per-thread query.
`toGraphQL()` similarly derives `unread_count` from the same preloaded
rows when available, instead of a second per-thread `findUnique`.
`threads()` now batches every thread's participants into one
`messageParticipants.findMany({where:{thread_id:{in: threadIds}}})` up
front, groups by `thread_id` in memory, and passes the map through.
`thread()`/`sendMessage()` call the same methods with no preloaded map
and keep their existing single-query behaviour completely unchanged —
batching only matters when listing many threads at once.

## Acceptance criteria (Given/When/Then)

- **Given** a caller with N threads, **when** `threads()` is queried,
  **then** the number of `messageParticipants.findMany` calls is
  bounded (2, not N+1).
- **Given** a single-thread read (`thread()`) or a message send
  (`sendMessage()`), **then** behaviour is unchanged from before.

## Traceability

`project-plans/analysis/02-findings-register.md` F-15.
