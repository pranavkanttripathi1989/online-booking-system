---
id: PLAN045
type: improvement
feature: queue-management
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ042
related: [REQ019, BUG019]
---

# PLAN045 — Check-in status tracking and waiting-room queue

## Design

Grounded in a real-code exploration pass (not guessed): `Appointments.status`
is a plain `String @default("scheduled")`, no DB enum — additive status
values need no migration. `AppointmentsService.transitionStatus()` already
does everything a new status transition needs (tenant/self-scoping via
`loadScoped`, `AppointmentStatusLogs` audit write, pubsub publish) — every
new method here is a one-line wrapper over it, matching `cancel()`/
`complete()`/`markNoShow()`'s existing shape exactly.

- `AppointmentFiltersInput.clinic_id` (new, optional) — `findAll()`'s `where`
  gains `if (filters?.clinic_id) where.clinic_id = filters.clinic_id`.
- `AppointmentsService.checkIn/startConsultation/resetAppointmentJourney` —
  thin `transitionStatus()` wrappers to `checked_in`/`in_consultation`/
  `scheduled`.
- `AppointmentsResolver.checkInAppointment/startConsultation/resetAppointmentJourney`
  — same `@Auth('manager','admin','super_admin','clinician','staff','receptionist')`
  gate as the sibling `completeAppointment`/`markNoShow` mutations.
- `waiting-room/index.jsx` — full rewrite off `mocks/store.js` onto
  `APPOINTMENTS_QUERY` + the mutations above. The mock's 5-stage
  `journeyStage()` derivation (keyed off a fabricated `journey` object) is
  replaced by a pure function keyed off the real `status` string — same 5
  stages, same `STAGE_META` labels/colors, zero UI redesign needed since the
  status vocabulary maps 1:1.
- `StatusChip.jsx` — `checked_in`/`in_consultation` added so any other page
  rendering these statuses shows a real label.
- `scripts/check-page-data-wiring.mjs` — `waiting-room/index.jsx` removed
  from the known-fabricated allowlist.

## A real bug fixed as a byproduct of verifying this slice

Running `check-page-data-wiring.mjs` from this Windows host (not inside a
Linux container) failed with `ENOENT: scandir 'D:\D:\online-booking-system\...'`
— `new URL('..', import.meta.url).pathname` returns a POSIX-shaped path
(leading slash before the drive letter) on Windows, which `path.join`
doesn't correctly treat as absolute, so a later step re-prepends `cwd`.
Fixed with `fileURLToPath()`. The gate itself was correct the whole time
(confirmed: it always ran fine inside `medibook_backend`/`medibook_frontend`,
and CI runs on a Linux runner) — this was specifically a "never run
successfully from this host directly" latent bug, only surfaced because
this slice needed to run it locally to confirm the allowlist change.

## Verification

Unit: 8 new `appointments.service.spec.ts` cases (status transitions +
tenant isolation + self-scoping for `checkIn`, plus the `clinic_id` filter).
Full backend suite 716/716 green, `tsc --noEmit`/`eslint` clean. Frontend:
`eslint` clean on all touched files, full Jest suite 63/63 green (no
existing coverage regression — `waiting-room/index.jsx` had zero unit tests
before and still has none; covered instead by a new e2e spec).
`check-page-data-wiring.mjs`: `2 known-fabricated, 0 new` (down from 3;
`waiting-room` no longer counted). New `frontend/e2e/waiting-room.spec.js`
(2 tests) run live against the real dev stack — both green after a retry
past a one-time Vite cold-compile delay on the route's first hit (the same
class of flakiness already documented in `TR069`, not a real defect). See
`TR071`.
