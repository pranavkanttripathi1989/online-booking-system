---
id: PLAN159
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ119
related: [TP179, TR179]
---

# PLAN159 — Implementation plan: hybrid-mode walk-in interleaving

## Change

**`backend/src/common/scheduling/interleave-walkins.ts`** (new) — pure
`interleaveByRatio<T>(booked: T[], walkIns: T[], ratio: number): T[]`.
N booked, then 1 walk-in, repeating; appends the remainder of whichever
list outlasts the other; a non-positive/non-integer ratio is treated as
1 (never divides by zero or loops forever).

**`backend/src/queue/queue.service.ts`**:

- `queueBoard()`'s waiting-entries query dropped `take: 5` (now fetches
  the full waiting list so interleaving can reorder across all of it),
  reads the day's active hybrid window (same query shape as
  `availability.service.ts#sessionAvailability`'s own `mode: {in:
  ['session','hybrid']}` lookup, narrowed to `mode: 'hybrid'`,
  `walkin_ratio: {not: null}`), and only *then* slices to 5 for display.
- New `applyWalkInInterleaving(entries, ratio)`: classifies each entry
  as booked or walk-in via the same-calendar-day heuristic (see
  `REQ119`'s own "deliberately out of scope" section and
  `context/open-questions.md` #17), hands both groups to
  `interleaveByRatio()`.

**`backend/src/availability/entities/availability.entity.ts`**: new
`walkinRatio?: number` on `AvailabilityType` — was accepted on write,
never returned on read.

**`backend/src/availability/availability.service.ts`**: `toGraphQL()`
now maps `a.walkin_ratio` through (the `mapCreateData()` write path
already handled it correctly).

**`frontend/src/pages/manager/Availability.jsx`**: `walkinRatio` added
to `GET_AVAILABILITY_DATA`; `walkin_ratio` added to the form's default/
edit-populate/submit-payload; the old "Walk-in interleaving... not built
yet" info banner replaced with a real "Booked:walk-in ratio" number
field, shown only for `mode === 'hybrid'`.

No `schema.prisma` change — `walkin_ratio` already existed on
`ClinicianAvailability` (REQ017, schema-only until now).

## Testing

`backend/src/common/scheduling/interleave-walkins.spec.ts` (new): 8
cases covering the 3:1 example from `REQ017`'s own acceptance criterion,
remainder-appending both directions, ratio of 1, empty-input edge cases,
and a non-positive/non-integer ratio never looping forever.

`backend/src/queue/queue.service.spec.ts`: 3 new cases — interleaving
applied correctly given a hybrid window with a ratio; order unchanged
with no hybrid window; order unchanged with a hybrid window but no
ratio set. Added a `clinicianAvailability.findFirst` mock (defaults to
`null`) to the shared test setup so every pre-existing `queueBoard` test
keeps its original, unaffected order.

`backend/src/availability/*.spec.ts`: re-run to confirm the new
`walkinRatio` field doesn't disturb existing coverage.

Full backend unit suite: 92/92 suites, 1464/1464 tests (11 new).
Integration suite: 4/4 suites, 387/387 tests — one transient failure
observed on a first run (unrelated `RightsRequests` fixture, in
`domain-cases.ts`/`fixture.ts`, both under active uncommitted edit by a
concurrent session on this machine), confirmed non-reproducing on an
immediate clean re-run. `tsc --noEmit`/`eslint` clean on backend;
`eslint` clean on both touched frontend files (one pre-existing, unrelated
`Divider` unused-import warning in `Availability.jsx`, not introduced
here).

## Documentation

`REQ119` (this requirement), `PLAN159` (this plan), `TP179`/`TR179`
(verification), `context/open-questions.md` #17 (the walk-in
classification heuristic), a context bundle, and index updates across
all five doc roots plus the `scheduling-engine` feature README.
