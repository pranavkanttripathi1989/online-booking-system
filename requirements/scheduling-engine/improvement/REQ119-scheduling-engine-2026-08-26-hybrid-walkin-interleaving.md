---
id: REQ119
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ017
related: [PLAN159, TP179, TR179]
---

# REQ119 — Hybrid-mode booked:walk-in interleaving (US-CAL-04)

## Why this slice

`REQ017` shipped session/hybrid-mode scheduling but explicitly deferred
this piece: *"'hybrid' is selectable (schema exists) but its walk-in
interleaving logic is P1, not built yet — the form says so"* and the
schema's own comment: *"walkin_ratio is schema-only for now — the
hybrid walk-in interleaving algorithm itself is P1, not built yet."*
`REQ017`'s own acceptance criterion for `US-CAL-04` names the exact
design: *"given a hybrid session with a 3:1 booked-to-walk-in
interleaving ratio, when the queue is built at check-in time, walk-ins
are interleaved at that ratio, not simply appended after all booked
patients — this interleaving logic is shared with REQ019 FR-QUE-02;
build it once, in the scheduling engine's queue-ordering function, and
have queue management call it rather than reimplementing it."`

A real gap found while scoping: `walkin_ratio` was write-only —
accepted by `CreateAvailabilityInput`/`UpdateAvailabilityInput` and
persisted, but never returned by the `Availability` GraphQL type, and
never exposed anywhere in `manager/Availability.jsx`'s form. A manager
had no way to actually set a real ratio through the UI at all. Closed as
part of this slice, not left as a second gap.

## User story

As a manager configuring a hybrid-mode availability window, I can set a
booked:walk-in ratio; as front desk running that clinic's queue, waiting
patients are ordered at that ratio rather than every walk-in landing at
the back of the line regardless of when they checked in.

## Acceptance criteria

- **Given** a hybrid window with `walkin_ratio: 3` and 5 booked + 2
  walk-in entries waiting, **then** the queue orders them
  booked,booked,booked,walk-in,booked,walk-in (3:1), not all 5 booked
  before either walk-in.
- **Given** no hybrid window applies (slot/session mode, the overwhelming
  majority of usage), **then** the existing `token_no`/`checked_in_at`
  order is completely unchanged — zero regression risk to the common
  path.
- **Given** a hybrid window with no `walkin_ratio` set, **then** order is
  also unchanged (interleaving only activates when a ratio is
  configured).
- **Given** the interleaving algorithm itself, **then** it is a pure,
  standalone, reusable function — `REQ017`'s own "build it once" mandate
  — not embedded inline in `queueBoard()`.
- **Given** a manager editing a hybrid-mode availability window, **then**
  they can set and see the booked:walk-in ratio in the form (previously
  impossible).

## In scope

- `interleaveByRatio()` (`common/scheduling/interleave-walkins.ts`) — the
  shared, pure merge algorithm.
- `queueBoard()`'s waiting-list classification + interleaving, gated on
  a real hybrid window with a set `walkin_ratio`.
- `Availability.walkinRatio` on the GraphQL type (was missing entirely).
- `manager/Availability.jsx`'s form: a real "Booked:walk-in ratio" field
  replacing the old "not built yet" info banner.

## Deliberately out of scope, logged not guessed

- **What counts as a "walk-in" vs. "booked"** — no explicit flag exists
  anywhere in this schema. A same-calendar-day-booking heuristic is used
  and documented as a deliberate simplification with a known
  false-positive case, not a silently-assumed certainty — see
  `context/open-questions.md` #17.
- Session-mode's own capacity/overbook display — unchanged.
