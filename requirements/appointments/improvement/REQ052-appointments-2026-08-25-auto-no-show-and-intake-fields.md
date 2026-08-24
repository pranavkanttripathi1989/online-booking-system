---
id: REQ052
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: REQ018
related: [REQ018]
---

# Auto-mark-no-show after grace period, and configurable intake fields

## Source

`REQ018`'s own P1 remainder (`US-BOOK-04`/`US-BOOK-06`), deliberately not
built in either of `REQ018`'s two prior shipped slices (P0 dedup/merge +
family profiles, then prepayment policy + booking widget config) — logged
as open in this codebase's own "picking this up" notes.

## User stories

**US-BOOK-04** — As the system, I want to auto-mark an appointment as a
no-show after a configurable grace period, so that staff don't have to
remember to close out abandoned bookings, and so future prepay
requirements can respond to a patient's no-show history.

- PRD ref: `FR-BOOK-13`
- Priority: P1
- Acceptance criteria: given an appointment past its grace period with no
  check-in, when the grace period elapses, then it transitions to
  `no_show` automatically, and a repeat-no-show patient is flagged for
  mandatory prepayment on their next booking per the org's configured
  threshold.

**US-BOOK-06** — As an Org Admin, I want to configure custom intake fields
per service (e.g., "current medications" for a first consult), so that the
clinician has relevant context before the patient arrives.

- PRD ref: `FR-BOOK-11`
- Priority: P1
- Acceptance criteria: given a service with 3 custom fields configured,
  when a patient books that service, then those 3 fields appear in the
  booking flow and their answers are visible in the resulting encounter
  (`REQ020`).

## Data-model impact

- No-show sweep: a `@Cron` job (reusing the `@nestjs/schedule` pattern
  already in `ScheduledReportsService`/`WebhookDispatchService`) finds
  `confirmed` appointments past `appointment_time + grace_minutes` with no
  check-in (`QueueEntries.status` never reached `in_progress`/`done`, or
  no `QueueEntries` row at all for a walk-in-only clinic), transitions
  them to `no_show`. `grace_minutes` is a small per-org config value
  (default provided, overridable).
- Repeat-no-show prepayment flag: `Patients.no_show_count` (incremented on
  each auto-mark), a per-org `no_show_prepayment_threshold` setting. When
  a patient's count reaches the threshold, their next booking is treated
  as requiring prepayment regardless of the product's own
  `prepayment_policy` — reusing `REQ018`'s existing prepayment-gate
  mechanism, not a second parallel one.
- Intake fields: `ClinicIntakeFieldConfig` (clinic-scoped, optionally
  product-scoped, ordered list of `{key, label, field_type, is_required}`)
  and a `Json` column on `Appointments` storing the submitted responses,
  visible from the encounter view per the acceptance criterion.

## Out of scope (deferred, not silently dropped)

Configurable notification to staff when the grace-period sweep runs (the
transition itself is silent, matching this codebase's existing
`AppointmentStatusLogs` audit-trail convention rather than adding a new
notification event in this slice). A UI for building intake-field
templates reusable across multiple clinics (a flat per-clinic list is
sufficient here, matching `REQ051`'s own checklist-item scoping decision).
