---
id: REQ167
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PP-PHASE2
related: [PLAN230, TP250, TR250]
---

# REQ167 — Immunisation schedule tracker (P2-11)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s slice tracker
names `P2-11` ("Immunisation schedule tracker... Large paediatric segment in
India; recall infra exists") as the next unblocked, not-started row, picked
up via the bare-`continue` resumption protocol in
`project-plans/phase-plans/README.md`. Confirmed still real before scoping:
`grep -ri "immuniz\|vaccin"` across the whole repo returns nothing — this is
genuinely net-new. "Recall infra exists" refers to `REQ029`'s lapsed-patient
recall logic and the existing `@Cron` sweep pattern
(`appointment-reminder-sweep.service.ts`, `low-stock-sweep.service.ts`,
`scheduled-reports.service.ts`) — reusable shapes, not a pre-existing domain.

## User story

As a clinician or front-desk staff member, I can see which vaccines a
paediatric (or older) patient is due, overdue, or up to date on against
India's National Immunization Schedule, record a dose as administered, and
have the patient's parent/guardian automatically reminded when a dose falls
overdue.

## Acceptance criteria

- **Given** a patient with a `date_of_birth`, **when** their immunisation
  status is fetched, **then** every active schedule item is returned with a
  computed status (`administered` / `overdue` / `due_soon` / `upcoming`)
  derived from `date_of_birth + due_age_days` versus today, matched against
  any already-administered record for that schedule item.
- **Given** an authorised caller (clinician who has treated the patient,
  staff/manager/admin in the patient's own org, or the patient/guardian
  themselves), **when** they record a dose, **then** an `ImmunizationRecords`
  row is created, denormalizing vaccine name and dose number even when a
  schedule item is linked.
- **Given** a caller with no relationship to the patient (wrong org, a
  clinician who never treated them, a different patient/guardian), **when**
  they attempt to read or record against that patient, **then** it is
  rejected — mirrors `encounters.service.ts#assertPatientAccess()` exactly.
- **Given** a patient (or their linked guardian account) with an overdue or
  soon-due vaccine, **when** the daily reminder sweep runs, **then** they
  receive at most one `immunization_due` notification per 7-day window, sent
  to the patient's own linked account if one exists, else the owning
  guardian's account (`PatientRelations`), else silently skipped if neither
  has a login.
- **Given** a patient's clinical timeline is fetched, **then** administered
  immunisations appear alongside encounters/diagnoses/test-results/messages
  as a `type: 'immunization'` event.

## In scope

- `ImmunizationScheduleItems` (platform-global reference data, India NIS,
  seeded) and `ImmunizationRecords` (patient-direct, `encounter_id` optional,
  no direct `client_org_id`/`clinic_id` — scoped transitively via
  `patient_id -> Patients.client_org_id`, mirroring `TestResults`).
- `immunizationSchedule`, `patientImmunizations`, `patientImmunizationStatus`
  queries; `recordImmunization` mutation.
- A daily reminder sweep (`immunization-reminder-sweep.service.ts`) with a
  guardian-fallback recipient resolver and a 7-day dedup window.
- One additive event branch on `encounters.service.ts#patientTimeline()`.
- A new "Immunizations" tab on `patients/detail.jsx` (status list + a Record
  dialog).

## Deliberately out of scope

- No admin/manager CRUD UI for the schedule itself — it's curated
  public-health reference data, seeded like `Drugs`/ICD-10, not an
  org-editable catalog like `Packages`/`MembershipPlans`.
- No chronic-disease registry/recall — that's `P2-12`, which explicitly
  depends on this slice.
- No billing/pricing integration — if a clinic charges for administration,
  that already flows through the existing service/product catalog untouched.
