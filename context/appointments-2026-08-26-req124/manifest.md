---
id: CTX-appointments-2026-08-26-req124
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ124
related: [PLAN164, TP184, TR184]
---

# appointments — REQ124: room assignment retries the next available room (2026-08-26)

First slice of the next 10-slice batch (`project-plans/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ124 | [Room assignment retry](../../requirements/appointments/improvement/REQ124-appointments-2026-08-26-room-assignment-retries-next-available.md) |
| implementation-plans | PLAN164 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN164-appointments-2026-08-26-room-assignment-retries-next-available.md) |
| test-plans | TP184 | [verification plan](../../test-plans/appointments/improvement/TP184-appointments-2026-08-26-room-assignment-retries-next-available.md) |
| test-results | TR184 | [verification results — pass](../../test-results/appointments/improvement/TR184-appointments-2026-08-26-room-assignment-retries-next-available.md) |

## What shipped

`context/open-questions.md` #14, reframed: not a product-judgment call
after all. `create()` previously picked the clinic's first active room
unconditionally and let the DB's own exclusion constraint reject the
*whole booking* if that room was busy, even with other active rooms
free. New `findFreeRoom()`/`isRoomFree()` helpers (mirroring
`assertSlotFree()`'s own overlap shape) try every active room in order;
session/hybrid-mode room selection is completely unaffected by design.

## Verification

Backend: 92/92 unit suites, 1474/1474 tests (4 new); integration 4/4
suites, 387/387 unchanged. `tsc --noEmit`/`eslint` clean. No frontend
change — GraphQL contract unchanged.
