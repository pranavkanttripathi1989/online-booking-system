---
id: PLAN041
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG017
related: [TP068, TR067]
---

# PLAN041 — Exclusion constraint for booking concurrency

No test-suggestions stage per `REQ013` Phase D — the acceptance test
already existed (`booking-concurrency.int-spec.ts`, deliberately
`it.failing`), written specifically as this fix's own acceptance criterion.

## 1. Fix the test's stale input shape first

Ran it standalone before touching anything — confirmed it was failing on
GraphQL schema validation (`succeeded: 0`), not the intended
double-booking assertion. Corrected `input` to the real `AppointmentInput`
contract (`service_id`/`start_datetime`/`notes`, no `room_id`/
`appointment_date`/`appointment_time`/`reason`), re-ran, confirmed
`succeeded: 5` — the real bug, now genuinely reproduced.

## 2. Migration

`20260823030000_appointments_no_overlap_exclusion_constraint`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_overlapping_booking"
EXCLUDE USING gist (
  clinician_id WITH =,
  tsrange(appointment_time, appointment_time + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_deleted = false AND status NOT IN ('cancelled', 'no_show'));
```

Validated the syntax and accept/reject behavior manually against
`postgres_test` before writing the real migration (scratch rows, dropped
before the real migration ran — that database gets truncated by every
`test:int` run's own global setup anyway).

`schema.prisma`: documentation comment above `Appointments`, matching the
established convention for DB objects Prisma can't express declaratively
(mirrors `ProductCancellationRules`'s own CHECK-constraint comment).

## 2b. Companion room-level constraint

Cross-referencing `technical-plans/01-phase1-mvp.md` §3.3 (written before
this session, designed against this exact table) showed it specifies a
room-level `EXCLUDE` alongside the clinician one, and exposed a real gap:
`create()`'s `rooms.findFirst(...)` has no availability check at all. Added
a second migration (`20260823031500_appointments_no_overlap_room_exclusion_constraint`)
mirroring the first, on `room_id` instead of `clinician_id`. Written as a
separate migration file, not appended to the already-applied first one —
editing an applied migration breaks Prisma's checksum tracking. Logged the
underlying room-selection gap as open question #14 rather than fixing it —
separate, larger scope.

## 3. Error mapping

`appointments.service.ts`: wrap the create transaction in try/catch.
Diagnosed the real error shape live (temporary diagnostic logging, removed
before finalizing) rather than guessing: `PrismaClientUnknownRequestError`,
no `code`/`meta` — matched by message substring against the constraint
name. **Also found live, not anticipated**: under genuine 5-way
concurrency, some interleavings raise a Postgres deadlock (`40P01`)
instead of the clean exclusion violation (`23P01`) — both map to the same
message now.

## 4. Turn the test green

Removed `it.failing`, added assertions on the failed attempts' error
messages (must be the clean one, never a raw error). Ran 5x back-to-back
to confirm reliability given the deadlock path is timing-dependent.

## Verification plan

See `TP068`.
