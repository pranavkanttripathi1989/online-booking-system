---
id: CTX-appointments-2026-09-03-req187-self-serve-reschedule-link
type: improvement
feature: appointments
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ187
related: [PLAN256, TP276, TR276]
---

# appointments — self-serve reschedule link in every reminder (P2-16)

`P2-16` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`,
picked up via a bare `continue` right after `P2-15`/`REQ186` shipped.
Tracker note: "Deflects front-desk calls cheaply." Given the genuine
complexity (a new token lifecycle, a public mutation touching
booking-integrity and payment-fee logic, and a real pre-existing bug
found along the way), this slice went through formal `EnterPlanMode`/
`ExitPlanMode` before any code was written.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ187 | [doc](../../requirements/appointments/improvement/REQ187-appointments-2026-09-03-self-serve-reschedule-link.md) |
| implementation-plans | PLAN256 | [doc](../../implementation-plans/appointments/improvement/PLAN256-appointments-2026-09-03-self-serve-reschedule-link.md) |
| test-plans | TP276 | [doc](../../test-plans/appointments/improvement/TP276-appointments-2026-09-03-self-serve-reschedule-link.md) |
| test-results | TR276 | [doc](../../test-results/appointments/improvement/TR276-appointments-2026-09-03-self-serve-reschedule-link.md) |

## The real gap

`AppointmentReminderSweepService` sent a reminder with no link at all —
`action_url` was only ever wired into the in-app notification bell, never
passed to `sendWhatsapp()`/`sendSms()`, the channels that actually reach a
patient without a portal login.

## What shipped

- A new single-use, time-boxed reschedule token on `Appointments`
  (mirroring `REQ107`'s `checkin_token_*` triad exactly), minted by the
  reminder sweep itself and included as a real link in the message.
- `issueRescheduleToken()` deliberately mints nothing when a still-valid,
  unused token from an earlier reminder in the same cycle already exists —
  since only a hash is ever persisted, a fresh mint would silently break
  the first reminder's own already-delivered link.
- Two new public GraphQL operations (`getRescheduleContext`,
  `reschedulePublicAppointment`) resolving strictly by token hash, reusing
  `assertSlotFree` and a newly-extracted `maybeChargeRescheduleFee` helper
  (lifted verbatim from `update()`'s own `REQ177` fee logic).
- A new public page, `/reschedule/:token`, reusing `booking/index.jsx`'s
  own slot-picking primitives (`getClinicianAvailability`/
  `getAppointments`) rather than a parallel mechanism.

## A real, pre-existing bug fixed as part of this slice

Neither `update()` nor anything else ever reset `reminder_count`/
`reminder_sent_at` on a reschedule — a rescheduled appointment could
silently never get another reminder (and therefore never a reschedule
link) for its new time once the old counter was already at cap. Fixed in
the shared code path both the staff-authenticated and new public
reschedule flows use.

## Deliberately NOT built (recorded, not silently dropped)

- Changing clinician/service on reschedule (same clinician only).
- Enforcing `ClientOrganizations.max_reschedules_per_month` — exists,
  editable, never enforced anywhere in this codebase; the token's own
  single-use nature is judged sufficient for this slice.
- A hard reschedule cutoff window — matches the staff path's own existing
  fee-only (not blocking) behaviour.
- Rescheduling a session/hybrid-mode appointment through this link — the
  page detects `booking_mode` and shows a "contact the clinic" message.
- Reminder delivery to patients with no login account — a separate,
  already-known gap.

## Verification

Backend: 20 new unit tests in `appointments.service.spec.ts` + 3 new in
`appointment-reminder-sweep.service.spec.ts`. Full backend unit suite
green (167/2681), `tsc`/`eslint` clean, live GraphQL introspection
confirmed both operations served, full integration suite green (13/516)
including `matrix-coverage.int-spec.ts`. Frontend: 8 new tests, `eslint`
clean of new errors, `check-page-data-wiring.mjs` clean, build/size green.
Full frontend suite run twice; 5 pre-existing unrelated suites flagged
each run — two spot-checked, confirmed non-deterministic host-load
flakiness, not a regression.

## Next in the phase-plans spine

`P2-16` marked done in `02-phase2-win-the-midmarket.md`;
`phase-plans/README.md`'s `▶ CURRENT POSITION` advanced to `P2-17`
(GST e-invoicing / IRP).

## Commits

`9c5bc9d` (backend), `0089c61` (frontend).
