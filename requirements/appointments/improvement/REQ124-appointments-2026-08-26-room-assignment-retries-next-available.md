---
id: REQ124
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [PLAN164, TP184, TR184]
---

# REQ124 — Room assignment tries the next available room, not just the first

## Why this slice

`context/open-questions.md` #14 ("`createAppointment`'s room assignment
has no availability check at all — a data-integrity backstop was added,
the underlying selection logic was not") was logged as a "decision
needed from the user" item, but re-reading it while scoping the next
batch found it isn't actually a product-judgment call: `create()` picks
the clinic's first active room (`rooms.findFirst`) unconditionally and
never checks whether it's free at the requested time — the real
protection is the database's own exclusion constraint, which rejects
the *entire booking* if that one room happens to be busy, even when a
different active room at the same clinic is genuinely free right then.
Trying the next room before giving up is strictly better with no
tradeoff to weigh — not a question that needed a human decision, just a
scoping correction on the earlier note's own framing.

## User story

As a patient or staff member booking a slot-mode appointment, when the
clinic's first room happens to be busy at my requested time but another
active room is free, my booking succeeds in that other room instead of
being rejected outright.

## Acceptance criteria

- **Given** a clinic with 2+ active rooms and the first is busy at the
  requested time, **when** a slot-mode appointment is created, **then**
  it succeeds, assigned to the next active room that's actually free.
- **Given** every active room is busy at the requested time, **then**
  the booking is rejected with a message distinct from "no active room
  exists at all" ("No room is free at this time" vs. "No active room
  available at this clinic") — an honest, specific failure, not a
  generic one.
- **Given** a session/hybrid-mode booking, **then** room selection is
  completely unchanged — those rows deliberately share one room across
  many concurrent tokens (capacity-gated, not room-exclusive), so
  availability-aware room picking doesn't apply and isn't touched.
- **Given** a session/hybrid window with its own configured room
  (`sessionWindow.room_id`), **then** that pinned room is still used
  directly, unchanged.

## In scope

- `findFreeRoom()`/`isRoomFree()` helpers in `appointments.service.ts`,
  mirroring `assertSlotFree()`'s existing overlap-detection shape,
  scoped per-room instead of per-clinician.
- Wiring into `create()`'s slot-mode room-assignment branch only.

## Deliberately out of scope

- Session/hybrid-mode room selection — unaffected by design (see
  acceptance criteria above).
- `bulkReschedule()`/`update()`'s own room handling — neither currently
  re-derives a room (a reschedule keeps the existing `room_id` unless
  explicitly changed via `input.room_id`), so there's no equivalent
  "first room only" gap to fix there.
