---
id: BUG017
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: []
---

# BUG017 — Concurrent bookings for the same slot could all succeed

`project-plans/analysis/06-execution-plan.md` P3.1 (F-16). `AppointmentsService.create()`
checks slot availability (`assertSlotFree()`) and inserts the row in two
separate statements with no application-level lock between them — N
concurrent requests for the same clinician/slot could all pass the check
before any of them wrote, live-confirmed by
`backend/test/integration/booking-concurrency.int-spec.ts` (deliberately
`it.failing` since it was written, per `technical-plans/00-foundation-hardening.md`
§4: "expected to fail until Phase 1 §3.3 adds the exclusion constraint").

## A second, real bug found while fixing this: the test itself was broken

Before touching the schema, ran the existing `it.failing` test standalone to
confirm its actual current failure mode. It wasn't failing because 5
requests succeeded — it was failing because **all 5 failed GraphQL schema
validation**, `succeeded` was `0`. The test's `input` object
(`room_id`/`appointment_date`/`appointment_time`/`reason`) never matched the
real `AppointmentInput` GraphQL type at all (`patient_id`, `clinician_id`,
`service_id`, `clinic_id`, `slot_id?`, `start_datetime`, `notes?`) — a stale
contract, not the intended assertion failure. `0 !== 1` still satisfies
`it.failing`'s "this is expected to fail" contract, so this went unnoticed:
the test never actually exercised the double-booking bug it was written to
prove. Fixed the input shape to the real contract (`service_id` from a real
seeded product, `start_datetime` instead of two separate date/time fields,
`notes` instead of `reason` — `create()` maps `notes` to the `reason`
column server-side) before touching the constraint, confirming live that 5
requests against the *corrected* input genuinely all succeeded (`succeeded:
5`) — the real bug, now actually reproduced.

## Fix

- New migration `20260823030000_appointments_no_overlap_exclusion_constraint`:
  enables `btree_gist`, adds a Postgres `EXCLUDE USING gist` constraint on
  `Appointments` — `clinician_id WITH =`, and the row's
  `[appointment_time, appointment_time + duration_minutes)` range `WITH &&`
  — scoped to `is_deleted = false AND status NOT IN ('cancelled', 'no_show')`,
  matching `assertSlotFree()`'s own existing filter exactly (this enforces
  the rule the application already intended, not a stricter one).
  `'[)'` bounds mean a booking ending exactly when another starts is
  back-to-back, not overlapping, and stays allowed.
- A second migration, `20260823031500_appointments_no_overlap_room_exclusion_constraint`,
  adds the same constraint shape on `room_id`. Found while cross-referencing
  `technical-plans/01-phase1-mvp.md` §3.3, which designs this exact pair
  together ("do this once, for both modes") — and which exposed a second,
  real, previously-unknown gap: `create()`'s room assignment
  (`rooms.findFirst({clinic_id, is_active, is_deleted})`) has no
  availability check at all, deterministically returning the same
  first-found active room regardless of whether it's already booked.
  Confirmed live: a real clinic (MG Road Clinic) has 2 active rooms, so two
  different clinicians could have been silently double-booked into the same
  room. This constraint is a data-integrity backstop for that — it does
  not fix the underlying room-*selection* logic, which still can't try a
  different room when the first candidate is busy. Logged as open question
  #14 rather than attempted here — real scope, needs its own requirement.
- `appointments.service.ts`'s `create()`: wraps the write transaction in a
  try/catch, mapping the resulting error to the existing clean
  `"This time slot is no longer available"` message. **Two distinct
  Postgres error shapes had to be mapped, not one**: a clean exclusion
  violation (`23P01`) under moderate contention, and — confirmed live under
  5 genuinely-parallel requests — a **deadlock** (`40P01`, `"deadlock
  detected"`) when two transactions' GiST index page locks interleave
  during real concurrent execution. Both mean the exact same thing to the
  caller (someone else got this slot) and both now map to the same message.
  Prisma surfaces both as a `PrismaClientUnknownRequestError` with no
  dedicated error code — matched by constraint name / message substring,
  not a Prisma-native error code, since none exists for either case.

## Verification

Backend: 3 new unit tests (exclusion-violation mapping, deadlock mapping, an
unrelated DB error is *not* swallowed behind the same message) — 686/686
full suite. `tsc --noEmit`/`eslint` clean.

Integration: `booking-concurrency.int-spec.ts` flipped from `it.failing` to
a real `it`, now asserting `succeeded === 1`, `persisted === 1`, and every
one of the 4 rejected attempts got the clean message, never a raw error.
Run 5 times back-to-back to confirm reliability under real timing variance
(the deadlock path is timing-dependent) — 5/5 green. Full integration suite
(183 tests, including the tenancy matrix) re-run afterward — no
regressions.

Live, against the real dev database (not just the test harness): logged in
as `manager@medibook.dev`, fired 5 genuinely concurrent `createAppointment`
requests (5 parallel `curl` processes, not `Promise.all` in one process) at
the same real clinician/product/slot. Exactly 1 succeeded; the other 4
returned `"This time slot is no longer available"`. Cleanup row deleted
afterward.

See `TR067`.

## What this does not close

- P3.2 (the timezone model — `appointment_time`/`appointment_date` are
  zone-less `TIMESTAMP`, not `TIMESTAMPTZ`) is untouched. The exclusion
  constraint's range comparison works correctly regardless of that
  decision, but the decision itself is still open, tracked separately.
- Did not add a client-facing retry-with-a-different-slot suggestion on
  rejection — the mutation just returns the same message a normal "slot
  taken" rejection would; no UX change beyond what already existed.
- `create()`'s room-selection logic itself is unfixed — see open question
  #14. The new room-level constraint only prevents the double-booking from
  silently succeeding; it doesn't make the booking succeed against a
  different, actually-free room instead.
