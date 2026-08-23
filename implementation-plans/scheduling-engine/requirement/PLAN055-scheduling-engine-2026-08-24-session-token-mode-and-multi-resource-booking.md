---
id: PLAN055
type: requirement
feature: scheduling-engine
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ017
related: [TP082, TR081]
---

# PLAN055 — Session/token scheduling mode + multi-resource booking (P0 slice)

REQ017's own phase assignment splits P0 (this slice) from P1 (explicitly
deferred, not built now). This is slice 1 of 6 in the current Phase 1 MVP
pass (REQ017 → REQ020 → REQ021 → REQ019 → REQ018 → REQ032, in that
dependency order — REQ017 is the critical path per
`project-plans/technical-plans/01-phase1-mvp.md`).

## Scope

**Built (P0):** session/token mode alongside the existing slot mode,
multi-resource intersection booking, capacity enforcement, sequential
token numbering, a simple booked-count-based wait estimate.

**Explicitly deferred (P1, per REQ017's own phase assignment):** hybrid-mode
walk-in interleaving (US-CAL-04, schema-only this slice — `walkin_ratio`
column exists, no runtime logic), waitlist with claim-links (US-CAL-06),
delay broadcast (US-CAL-07), bulk-reschedule-with-accept (US-CAL-08), and
the rolling-median `SessionThroughput` live-ETA refinement (US-CAL-02's
"recalculates as the clinic runs" — needs REQ019/REQ020's real
`checked_in→completed` data to mean anything).

## Design decisions worth recording

**`booking_mode` column, not a fabricated per-token time slice.** The two
existing DB exclusion constraints (`appointments_no_overlapping_booking`,
`appointments_no_overlapping_room_booking`) assume one appointment = one
exclusive time range per clinician/room. Session mode breaks that on
purpose — many tokens share the same clinician, room, and start time.
Rather than synthesize a fake per-token time slice to keep the existing
constraints happy, `Appointments` gained `booking_mode` (denormalized from
the governing `ClinicianAvailability.mode` at booking time) and both
constraints were narrowed to `WHERE booking_mode = 'slot'`. Session/hybrid
mode's capacity guarantee is instead a `pg_advisory_xact_lock`-guarded
count-then-insert — a different but equally real guarantee (semantically
correct for "don't exceed capacity", not "don't overlap in time").

**`Resources.clinic_id`, not `branch_id`.** The technical plan's own sketch
uses `branch_id`; this codebase's actual branch entity is `Clinics`, and
every existing model FKs to it as `clinic_id`. Per
`05-cross-cutting-conventions.md`'s own rule (codebase wins on convention),
used `clinic_id`.

**`AppointmentResources` owns a denormalized `start_at`/`end_at`.** Postgres
`EXCLUDE` predicates can only reference the constrained table's own
columns — copied at insert time from the parent appointment. Rows are
deleted (not status-filtered) when the parent is cancelled/no_show'd/
soft-deleted, so "no row = resource is free" needs no status column.
Resource assignment is immutable after creation this slice (matching the
already-accepted room-reassignment-on-reschedule gap, `context/open-questions.md`
#14); a reschedule that changes time also updates these rows' `start_at`/
`end_at` in the same transaction.

**Duplicated (not shared) across the two GraphQL dialects.** The public/
patient-self-serve `bookPatientAppointment` (`public.service.ts`) has its
own, separate appointment-creation path from the canonical
`AppointmentsService.create()` — session/token logic is duplicated there
rather than extracted into a shared service, matching this codebase's own
established precedent for keeping the two dialects independently
implemented (CLAUDE.md's dialect note).

## What was built

**Schema** (`backend/prisma/migrations/20260824000000_scheduling_engine_session_mode/`):
`ClinicianAvailability.{mode,capacity,overbook_allowance,walkin_ratio}`;
`Appointments.{booking_mode,token_no}`; both exclusion constraints
re-scoped to `booking_mode='slot'`; new `Resources`/`AppointmentResources`
tables, the latter with its own `EXCLUDE USING gist` constraint.

**Backend:** `availability.service.ts` skips slot generation for non-slot
windows and gained `sessionAvailability()` (capacity/remaining/estimate,
`@Public()` for the pre-login wizard); new `backend/src/resources/` module
mirroring `rooms/`'s structure but scoped via its own `client_org_id`
(`orgScope`/`orgIdForWrite`) rather than `orgScopeVia` through a relation;
`appointments.service.ts`'s `create()` branches on the governing
availability window's mode — slot mode unchanged (plus optional
`resource_ids` intersection checking), session/hybrid mode uses the
advisory-lock-guarded count-then-insert; `public.service.ts`'s
`bookPatientAppointment` duplicates the session-mode branch for the same
reason stated above.

**Frontend:** new `manager/resources/index.jsx` admin page (card-grid +
inline-form, matching `manager/rooms/index.jsx`'s actual live-linked
pattern); mode/capacity fields added to both availability admin surfaces
(`manager/Availability.jsx`, `clinician/Availability.jsx`); `booking/index.jsx`
renders a "join this session" card (capacity remaining, token preview,
simple wait estimate) in place of the time-slot grid when the selected day
is session/hybrid mode; `calendar/index.jsx` prefixes session/hybrid
appointment titles with their token number.

## Tests

New coverage: `availability.service.spec.ts` (mode/capacity round-trip,
`availableSlots()` skipping non-slot windows, `sessionAvailability()` math),
`resources.service.spec.ts` (full tenant-isolation suite mirroring
`rooms.service.spec.ts`), `appointments.service.spec.ts` (session-mode
capacity enforcement + token sequencing, multi-resource booking, resource
cleanup on cancel/no_show), `public.service.spec.ts` (the duplicated
session-mode path). New e2e spec `scheduling-session-mode.spec.js`.

See `TP082`/`TR081` for the full verification record.
