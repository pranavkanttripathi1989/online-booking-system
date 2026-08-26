---
id: CTX-scheduling-engine-2026-08-26-req119
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ119
related: [PLAN159, TP179, TR179]
---

# scheduling-engine — REQ119: hybrid-mode walk-in interleaving (2026-08-26)

Sixth slice of the next 10-slice batch (`project-plans/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ119 | [Hybrid walk-in interleaving](../../requirements/scheduling-engine/improvement/REQ119-scheduling-engine-2026-08-26-hybrid-walkin-interleaving.md) |
| implementation-plans | PLAN159 | [implementation plan](../../implementation-plans/scheduling-engine/improvement/PLAN159-scheduling-engine-2026-08-26-hybrid-walkin-interleaving.md) |
| test-plans | TP179 | [verification plan](../../test-plans/scheduling-engine/improvement/TP179-scheduling-engine-2026-08-26-hybrid-walkin-interleaving.md) |
| test-results | TR179 | [verification results — pass](../../test-results/scheduling-engine/improvement/TR179-scheduling-engine-2026-08-26-hybrid-walkin-interleaving.md) |

## What shipped

`REQ017`'s own deferred `US-CAL-04`: a pure, shared `interleaveByRatio()`
function (matching `REQ017`'s own "build it once" mandate, reused by
`REQ019`'s queue-ordering per its acceptance criterion), wired into
`queueBoard()`'s waiting-list ordering for hybrid-mode windows with a
set `walkin_ratio`. Also closed a second, previously-invisible gap found
while scoping: `walkinRatio` was write-only (accepted, persisted, never
returned or exposed in the frontend form) — both the GraphQL type and
`manager/Availability.jsx`'s form now round-trip it.

Logged a genuine, honestly-scoped ambiguity rather than guessing:
`context/open-questions.md` #17 — no `is_walk_in` flag exists anywhere
in this schema, so a same-calendar-day-booking heuristic classifies
entries, with a documented false-positive case.

## Verification

Backend: 92/92 unit suites, 1464/1464 tests (11 new); integration 4/4
suites, 387/387 (one confirmed-transient failure from a concurrent
session's unrelated in-flight file edit, non-reproducing on re-run).
`tsc --noEmit`/`eslint` clean. Frontend: `eslint` clean on both touched
files. Live verification not performed — shared dev backend mid-flight
on unrelated concurrent work.
