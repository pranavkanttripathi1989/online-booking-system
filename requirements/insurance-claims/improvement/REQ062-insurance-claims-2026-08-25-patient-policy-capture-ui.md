---
id: REQ062
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ031
related: []
---

# REQ062 — Patient insurance policy capture UI

## Source

`project-plans/08-integration-gap-analysis.md` finding A-7 — a fresh
sweep cross-checking every backend GraphQL operation against real
frontend usage. Closes real, already-shipped backend capability from
`REQ031`'s own P0 scope that never got frontend UI.

## Current-state gap

`backend/src/insurance/insurance.resolver.ts` — both
`patientInsurancePolicies(patient_id)` and
`createPatientInsurancePolicy(input)` exist, gated
`@Auth('patient','staff','manager','admin','super_admin')`, tested.
`admin/Payers.jsx` covers the payer master + branch empanelment half of
`REQ031`; nothing under `frontend/src` referenced
`patientInsurancePolicies` or `createPatientInsurancePolicy` — confirmed
zero matches, including on `patients/detail.jsx`. `REQ031`'s own "manual
patient policy capture" P0 user story was unbuilt on the frontend — front
desk had no way to record which payer/policy a specific patient is
covered under.

`patients/detail.jsx` itself is otherwise still mock-driven pending a
separate product decision (`context/open-questions.md` #13, five named
sub-features: Letters, membership plans, intake questionnaire, document
upload, communication log). Insurance is not one of those five — this
slice adds a genuinely independent, real tab, not a rider on that
standing pause.

## What shipped

A new "Insurance" tab on `patients/detail.jsx`, real GraphQL against the
real route `:id` (confirmed a genuine patient database UUID even though
the rest of the page's `MOCK_PATIENTS_DETAIL` lookup doesn't recognize
it):

- Lists existing policies (payer name, policy number, policy holder
  name, valid-from/until dates, active/inactive status), or a real empty
  state.
- "Add Policy" opens a dialog: payer picker (from the real, global
  `payers` query), policy number, policy holder name, valid-from
  (required), valid-until (optional). Calls the real
  `createPatientInsurancePolicy` mutation and refetches.

## User stories

- As front-desk staff, I can record which payer and policy number a
  patient is covered under, without direct database access.
- As a manager or admin, I can see a patient's insurance history at a
  glance from their profile.

## Acceptance criteria (Given/When/Then)

- **Given** a patient with no recorded policies, **when** the Insurance
  tab loads, **then** a real empty state is shown (not fabricated data).
- **Given** staff submits a new policy with a payer, policy number,
  policy holder name, and valid-from date, **when** the form is
  submitted, **then** the real `createPatientInsurancePolicy` mutation
  fires and the new policy appears in the list after a refetch.
- **Given** a required field is missing, **then** the form is rejected
  client-side with a clear message, matching every other form on this
  page's own validation convention.

## Traceability

`REQ031` (US-INS-03, manual patient policy capture) — this closes the
frontend half; the backend mutation and query already shipped. No new
`FR-*` scope — UI completion for already-specified backend capability.
