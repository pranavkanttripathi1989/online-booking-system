---
id: PLAN160
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ120
related: [TP180, TR180]
---

# PLAN160 — Implementation plan: bulk-reschedule a clinician's day

## Change

**`backend/src/appointments/dto/appointment.input.ts`**: new
`BulkRescheduleAppointmentsInput {clinician_id, date, shift_minutes}`.

**`backend/src/appointments/entities/appointment.entity.ts`**: new
`BulkRescheduleResultType {attempted_count, rescheduled_count,
failed_count}` — an honest partial-success count, matching `REQ118`'s
own `notified_count`-vs-`waiting_count` precedent for a bulk action.

**`backend/src/appointments/appointments.service.ts`**: new
`bulkReschedule(input, user)` — validates a non-zero
`shift_minutes`, validates the clinician belongs to the caller's org
(`isSameOrg`, the same check shape `queue.service.ts`'s
`assertClinicianAccess` already established), loads every
`scheduled`/`confirmed` appointment for that clinician on that day, and
for each: computes the shifted time, runs `assertSlotFree()` for
slot-mode rows only (session/hybrid rows are exempt, matching
`create()`/`update()`'s own branching), updates the appointment +
its attached `AppointmentResources` time range inside a small
per-row transaction, and publishes `APPOINTMENT_UPDATED_EVENT`. A
per-row failure (a real DB conflict) is caught and counted, not
allowed to abort the rest of the batch.

**`backend/src/appointments/appointments.resolver.ts`**: new
`bulkRescheduleAppointments` mutation, gated the same as other
front-desk-initiated actions (`manager`/`admin`/`super_admin`/`staff`/
`receptionist` — no `clinician`, since a whole-day shift is a front-desk
operation, not clinician self-service).

**`frontend/src/pages/appointments/index.jsx`**: a "Bulk Reschedule"
icon button in the existing filter toolbar (next to "Clear filters"),
enabled only once a specific clinician is selected in the already-there
clinician filter; opens a dialog for the target day (defaults to
today) + a shift-minutes value, calls the mutation, shows a result
snackbar naming the honest count, and refetches the list.

No `schema.prisma` change.

## Testing

`backend/src/appointments/appointments.service.spec.ts`: 6 new cases
— zero-shift rejection, cross-org rejection, correct per-row shift with
an honest count, the `scheduled`/`confirmed`-only + single-day query
scope, a per-row conflict counted as a failure without aborting the
rest of the batch, and the slot-conflict check skipped for
session/hybrid-mode rows. Added a `clinicians` mock to the shared
`prisma` test double (didn't exist in this file before).

Full backend unit suite: 92/92 suites, 1470/1470 tests (6 new).
Integration suite: 4/4 suites, 387/387 unchanged. `tsc --noEmit`/
`eslint` clean on backend; `eslint` clean on the touched frontend file
(only pre-existing hex-color warnings, none new).

## Documentation

`REQ120` (this requirement), `PLAN160` (this plan), `TP180`/`TR180`
(verification), a context bundle, and index updates across all five doc
roots plus the `appointments` feature README.
