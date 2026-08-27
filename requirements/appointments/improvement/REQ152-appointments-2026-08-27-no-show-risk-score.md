---
id: REQ152
type: improvement
feature: appointments
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ018
related: [REQ018, REQ052, PLAN193, TP213, TR213]
---

# REQ152 — No-show risk score (P1-17)

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-17**:
"score per appointment from history (prior no-shows, lead time, channel,
service). Drive: whether prepayment is required, reminder intensity, and
session overbook allowance. All three levers already exist — this joins
them." That last sentence was investigated before writing any code (two
research forks, not assumed) and found only partly true.

## What "already exists" actually meant — investigated before scoping

1. **Prepayment** — real. `appointments.service.ts#create()` already
   forced `awaiting_payment` once `Patients.no_show_count` crossed
   `ClientOrganizations.no_show_prepayment_threshold` (REQ052/US-BOOK-04).
   Genuinely joinable: replace the flat threshold compare with a real
   score.
2. **Reminder intensity** — **not real**. `appointment_reminder` was
   fully registered as an event type in `notification-trigger.service.ts`
   (its `DEFAULTS`, quiet-hours bypass list, WhatsApp category map,
   `TRANSACTIONAL_EVENTS`) — but nothing anywhere ever called `dispatch()`
   for it. The file's own comment already said so: *"appointment_reminder
   (needs a scheduled job, not an event hook)"*. This had to be built
   from scratch, not joined.
3. **Overbook allowance** — real but static.
   `ClinicianAvailability.overbook_allowance` is a fixed per-session-
   window integer, consumed identically in `appointments.service.ts` and
   `public.service.ts`. Deliberately **not** made dynamic this slice —
   see "Deliberately out of scope" below.

## What shipped

- **`backend/src/appointments/no-show-risk.ts`** — a pure, unit-tested
  scoring function (`computeNoShowRisk`) from three real inputs: prior
  no-show count (weighted against the org's own configured threshold,
  not a hardcoded number — preserves REQ052's exact "threshold reached ==
  forced prepayment" guarantee even in the worst-case discount stack),
  lead time between booking and the appointment (a far-out booking scores
  higher, a same-day one lower), and booking channel (self-booked scores
  higher than staff-booked). **Weights are a documented, defensible first
  pass grounded in commonly-cited no-show-prediction factors, not a model
  fitted against this org's own real outcome data** — none exists yet.
- **Prepayment (joined)**: `create()`'s flat threshold check replaced
  with `computeNoShowRisk(...).level === 'high'`.
- **`Appointment.no_show_risk`** — a new GraphQL field, computed fresh on
  every read from the patient's *current* no_show_count (never a stored/
  stale column), exposed on both `findOne` and `findAll`.
- **Reminder intensity (built)**: new
  `AppointmentReminderSweepService`, mirroring `NoShowSweepService`'s own
  hourly-`@Cron`/per-row-try-catch/synthetic-system-caller shape exactly,
  against the identical `'confirmed'` population. Low/medium risk gets
  one reminder (23-24h before); high risk gets an extra earlier one
  (47-48h before) too. A new `Appointments.reminder_count` column (not
  just `reminder_sent_at`, which can't express "how many") gates each
  send.
- **Escalation reused, not rebuilt**: `AppointmentInput` gained no new
  field for this slice (P1-16 already added `escalated_from_encounter_id`
  the same day) — the risk score simply feeds the same, already-existing
  prepayment path.

## Frontend

- `appointments/index.jsx` — a new "No-show Risk" DataGrid column
  (`NoShowRiskChip`), each level carrying its own icon (not colour alone,
  A11Y-3), with the real reasons in a tooltip. Deliberately a page-local
  query extension (`APPOINTMENTS_WITH_RISK_QUERY`, sibling-selecting
  `no_show_risk` alongside the shared `AppointmentFields` fragment spread)
  rather than editing the shared fragment/query itself — 5 other pages
  consume that shared contract and none of them need this field
  (ARCH-15/Hard Rule 7: touch only this page's own real contract).
- **A real, separate, pre-existing gap found and fixed while building
  this** (BOOK-14/BOOK-19): `BookingStep5Confirm.jsx` (the internal
  staff-facing booking wizard) rendered its "Booked! 🎉" success screen
  unconditionally on any `createAppointment` response, even one that
  landed `awaiting_payment` — for the *already-existing* REQ052
  mechanism, before this slice added a second reason to hit it. No
  frontend surface anywhere handled `awaiting_payment` (confirmed by
  search). Fixed with a new `AwaitingPaymentScreen`, explaining the real
  reason (the risk reasons when risk-driven, a generic prepayment
  message otherwise) and sending staff straight to the existing real
  "Take Payment" action on `/appointments/:id`.

## Deliberately out of scope

- **Automated overbook-allowance adjustment.** A real, considered scope
  cut, not an oversight: dynamically raising a session's own
  `overbook_allowance` based on its booked patients' aggregate risk
  carries genuine scheduling-safety risk (a wrong computation could
  double-book or silently under-book a whole session) that this slice's
  own testing couldn't fully retire without a dedicated, separately-
  reviewed pass. Staff can already act on the same information manually
  via the existing availability-editing UI once they see risk on the
  list. Flagged here, not silently dropped.
- The reminder sweep's own timing windows (23-24h / 47-48h before) and
  a reminder-timing config field on `ClientOrganizations` — no such field
  existed; a fixed, documented default was used instead of adding
  another per-org setting this slice didn't scope UI for.
- A drug-name-precision-style accuracy benchmark for the risk weights
  themselves — no real outcome dataset exists in this environment to fit
  or validate against; the weights are a defensible starting point,
  flagged as such, not claimed as validated.

## Exit criteria (from the phase-plan slice)

- [x] A high-risk booking demands prepayment and says why — both in the
  backend (a real GraphQL-level enforcement, integration-tested) and now
  the frontend (the previously-nonexistent `AwaitingPaymentScreen`).
