---
id: REQ163
type: improvement
feature: scheduling-engine
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ017
related: [PLAN222, TP242, TR242]
---

# REQ163 — Recurring/series appointments + treatment-plan scheduling (P2-10)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s slice
tracker names `P2-10` as the next unstarted, unblocked slice: *"Recurring/
series appointments + treatment-plan scheduling... Multi-sitting packages
exist; series scheduling doesn't."*

Confirmed via three research passes over the real code before scoping
(not assumed): nothing today lets a caller create more than one linked
appointment in one action. `AppointmentsService.create()` and the public
`bookPatientAppointment()` both take exactly one `start_datetime`/one
service; neither the staff `BookingWizard` nor the public booking wizard
has any repeat/frequency UI. Every existing "recurrence" concept
(`ClinicianAvailability`, `LunchBreaks`, `RoomBlocks`, `SpacerBlocks` and
their frontend pickers) is about a clinician's *working-hours pattern*,
not a patient's *appointment series* — zero overlap, and those fields are
themselves functionally dead beyond day-of-week matching (confirmed no
materialization/expansion logic exists anywhere for them). `Packages`/
`PatientPackages` (REQ054) only offsets *payment* on an appointment that
already exists — it never creates or schedules anything, and there is no
FK from `Appointments` to any grouping entity today.

## User story

As a manager or clinician, I can create a named series of linked
appointments in one action — either a simple recurring series (same
service, repeated weekly/biweekly/monthly for N occurrences) or a
heterogeneous treatment plan (a sequence of different services scheduled
over time) — so a patient's ongoing care plan doesn't require booking
each visit separately. As a patient, I can view my own active series in
the patient portal. As staff, I can cancel the remaining occurrences of a
series in one action without disturbing ones already completed.

## Acceptance criteria (Given/When/Then)

- **AC1**: Given a manager creating a "Recurring" series (one service,
  weekly frequency, 4 occurrences) for a patient with real clinician
  availability on all 4 dates, when submitted, then 4 real `Appointments`
  rows are created, each linked via `series_id`/`series_occurrence_no`,
  and the response reports `created_count: 4, failed_count: 0`.
- **AC2**: Given the same series where occurrence #3's slot is already
  booked by another patient, when submitted, then occurrences 1, 2, 4
  succeed and occurrence 3 fails with a clear reason in the response —
  never a silent partial success and never an all-or-nothing rollback of
  the other 3.
- **AC3**: Given a "Treatment Plan" series with different `service_id`s
  per occurrence, when submitted, then each occurrence is validated and
  created exactly as a normal single appointment would be (tenant scope,
  patient self-scope, intake fields, prepayment/no-show-risk policy,
  slot-vs-session-mode conflict checking — all reused, not
  reimplemented).
- **AC4**: Given a retry of the same "Create Series" request with the
  same outer `idempotency_key` (e.g. a double-click), when resubmitted,
  then no duplicate occurrences are created — each inner per-occurrence
  create call is itself idempotent via a deterministic derived key.
- **AC5**: Given an active series with some occurrences already completed
  and some still scheduled, when a manager cancels the series, then only
  the non-terminal occurrences move to `cancelled` — completed ones are
  untouched — and the series' own `status` becomes `cancelled`.
- **AC6**: Given a patient viewing their own appointments, when a
  `series_id` is present on one, then a "Part of series" badge links to
  the series detail view listing every occurrence and its status.
- **AC7**: Given a cross-tenant or cross-patient caller, when they attempt
  to read or act on a series that isn't theirs, then the request is
  rejected — tenant scoping and patient self-scope (`ownAndDependantPatientIds`,
  REQ065's pattern) both apply to every series operation.

## Data model impact

New `AppointmentSeries` model; `Appointments` gains two new nullable
columns (`series_id`, `series_occurrence_no`). See `PLAN222` for the full
schema/migration detail.

## Deliberately NOT built this slice

- No auto-detection of "does this patient already have an active series
  for this service" (a future dedupe/upsell feature).
- No per-occurrence cancellation-fee enforcement — `ProductCancellationRules`
  isn't enforced anywhere today even for a single appointment, so there's
  nothing to keep consistent across a series.
- No lazy/on-demand occurrence generation, no background sweep — every
  occurrence is a real row from the moment the series is created.
- No automatic `'completed'` series-status transition stored server-side
  — the frontend derives a "completed" display state from its own
  occurrences' statuses.

See `PLAN222` for the full technical design and `TR242` for verification
outcomes.
