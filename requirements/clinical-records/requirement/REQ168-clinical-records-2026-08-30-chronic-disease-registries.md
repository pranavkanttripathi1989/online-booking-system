---
id: REQ168
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PP-PHASE2
related: [PLAN231, TP251, TR251]
---

# REQ168 — Chronic-disease registries (diabetes/HTN) + recall (P2-12)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s slice tracker
names `P2-12` ("Chronic-disease registries (diabetes/HTN) + recall...
Cohort reports already built") as the next unblocked slice after `P2-11`,
picked up via the bare-`continue` resumption protocol. Confirmed via a
full research pass that nothing chronic-disease-specific exists anywhere,
and that "cohort reports already built" (`REQ029`'s `getPatientReportGroup`)
is entirely visit/acquisition-based — reusable only as a query-shape
template, not as extendable logic.

## User story

As a manager or clinician, I can enroll a patient into a diabetes or
hypertension registry (confirming a suggestion derived from their real
diagnosis history, or enrolling directly), see which enrolled patients are
due, overdue, or up to date on their recall review, mark a review as done,
and have the clinic's own staff notified when a patient falls overdue —
so chronic patients don't silently fall out of follow-up care.

## Acceptance criteria

- **Given** a patient with a diagnosis whose `icd10_code` matches a known
  diabetes/hypertension prefix, **when** suggestions are requested for
  that condition, **then** the patient appears as a candidate, excluding
  anyone already enrolled.
- **Given** a caller enrolling a patient in a different org, **then** it
  is rejected (Hard Rule 6).
- **Given** an active enrollment, **when** its status is computed against
  `last_reviewed_at + 90 days`, **then** it is `overdue` / `due_soon`
  (within 30 days) / `upcoming` accordingly.
- **Given** a clinician marks a review done, **then** `last_reviewed_at`
  resets to now, moving the enrollment back to `upcoming`.
- **Given** an enrollment falls overdue, **when** the daily recall sweep
  runs, **then** every admin/manager in that patient's org receives at
  most one `chronic_registry_recall_due` notification per 7-day window.

## In scope

- `ChronicRegistryEnrollments` (patient-direct, no direct `client_org_id`,
  mirrors `TestResults`/`ImmunizationRecords`), `ChronicConditionType`
  enum (`diabetes`, `hypertension` — a fixed pair, not an open catalog).
- `chronicRegistrySuggestions`, `registryEnrollments` queries;
  `enrollInRegistry`, `markRegistryReviewed`, `resolveRegistryEnrollment`
  mutations.
- A daily recall sweep notifying org staff (not the patient — a
  population-health outreach list, the reverse of `REQ167`'s own
  patient-facing reminder).
- `manager/registries/index.jsx` — enrolled-patient list per condition
  with recall status, a Mark Reviewed action, and a Suggested Candidates
  panel.

## Deliberately out of scope

- No live diagnosis-code auto-enrollment — `Diagnoses.icd10_code` is free
  text with no guaranteed cleanliness; enrollment is always a confirmed
  clinician action off a suggestion, never automatic.
- No per-condition differentiated review interval — one fixed 90-day
  constant for both conditions, a stated simplification.
- No patient self-service view of their own registry status.
- No `analytics.service.ts` dashboard chart — the operational registries
  page covers the real "who needs a call" need directly.
