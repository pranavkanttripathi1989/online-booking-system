---
id: PLAN164
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ124
related: [TP184, TR184]
---

# PLAN164 — Implementation plan: room assignment retries the next available room

## Change

**`backend/src/appointments/appointments.service.ts`**:

- New `isRoomFree(roomId, start, end)`: same overlap-detection shape as
  `assertSlotFree()` (a `findFirst` filtered to `booking_mode: 'slot'`,
  non-cancelled/no-show, `appointment_time < end`, then a manual
  `conflictEnd > start` check), scoped to one room.
- New `findFreeRoom(clinicId, start, end)`: loads every active room at
  the clinic ordered oldest-first, returns the first one `isRoomFree()`
  accepts, or `null` if none are free.
- `create()`'s room-assignment branch: unchanged for a pinned
  session/hybrid room (`sessionWindow.room_id`) and for the
  session/hybrid unpinned fallback (still `rooms.findFirst`, since
  those rows share a room by design). For slot mode with no pin, now
  calls `findFreeRoom()`; on `null`, distinguishes "no active room
  exists" from "every active room is busy" with a second cheap
  `findFirst` check, so the error message is honest either way.

No `schema.prisma` change.

## Testing

`backend/src/appointments/appointments.service.spec.ts`: added a
`rooms: findMany` mock (didn't exist before — needed by the new
`findFreeRoom()`), defaulted to a single free room so every
pre-existing slot-mode `create()` test keeps assigning `room-1`
unchanged. 4 new cases in a `room assignment (REQ124)` block: assigns
the first room when free; tries the next room when the first is busy
(the core fix); rejects with the "no room is free" message when every
room is busy; rejects with the original "no active room" message when
the clinic has zero active rooms.

Full backend unit suite: 92/92 suites, 1474/1474 tests (4 new).
Integration suite: 4/4 suites, 387/387 unchanged (no new domain — an
internal refinement to the already-covered `appointments` create path).
`tsc --noEmit`/`eslint` clean.

## Documentation

`REQ124` (this requirement), `PLAN164` (this plan), `TP184`/`TR184`
(verification), a context bundle, and index updates across all five doc
roots plus the `appointments` feature README.
