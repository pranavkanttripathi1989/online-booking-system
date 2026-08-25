---
id: PLAN089
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ062
related: []
---

# PLAN089 — Implementation plan for patient insurance policy capture UI

Technical implementation plan for `REQ062`. No backend change —
`payers`, `patientInsurancePolicies`, and `createPatientInsurancePolicy`
already exist and are already tested.

## Backend facts confirmed before designing the UI

- `patients/detail.jsx` is confirmed entirely mock-driven (zero
  `useQuery`/GraphQL calls anywhere in the file before this slice) —
  already logged as a known, deliberately-paused gap
  (`context/open-questions.md` #13), covering five *other* named
  sub-features (Letters, membership plans, intake questionnaire,
  document upload, communication log). Insurance is not one of the five
  — adding it does not touch or reopen that pause.
- The route param `:id` on `/patients/:id` is confirmed to carry the
  *real* patient database UUID even on this mostly-mock page (React
  Router's `useParams()` reads it regardless of what the page does with
  it) — `patients/index.jsx`'s own list links here with real ids. A new,
  independent `useQuery` keyed on this same `id` is therefore safe and
  correctly scoped, without needing to touch or trust the rest of the
  page's `MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT` fallback.
- `PatientInsurancePolicyInput` requires `patient_id`, `payer_id`,
  `policy_number`, `policy_holder_name`, `valid_from`; `valid_until` is
  optional. `payers` takes an `is_active` filter (used: `true`, so an
  admin-deactivated payer never appears as a selectable option for a new
  policy).

## Frontend — `frontend/src/pages/patients/detail.jsx`

New inline `GET_PATIENT_INSURANCE` (combines `payers` and
`patientInsurancePolicies` in one round trip — both are read together on
tab load, so one query avoids a second waterfall) and
`CREATE_PATIENT_INSURANCE_POLICY`, plus a new "Insurance" tab (index 8,
after the existing Communication Log tab) with its own `TabPanel`:

- A table of existing policies (payer name, policy number, holder name,
  valid-from/until, active/inactive chip), or a real empty state.
- An "Add Policy" button opening a `Dialog`: payer `<TextField select>`
  (populated from `payers`), policy number, policy holder name,
  valid-from (`type="date"`, required), valid-until (`type="date"`,
  optional). Client-side validation mirrors the input's own required
  fields before the network round trip — matching every other form on
  this page's own convention (a `TextField` component was reused for
  `type="date"`, since the page has no MUI DatePicker import already in
  scope for this one addition).
- `submitPolicy` calls `createPolicy`, `enqueueSnackbar`s success or the
  real server error, closes the dialog, and `refetchInsurance()`s.

## Testing (see `TP116`)

- New `frontend/src/pages/patients/detail.test.jsx`: real empty state
  when no policies exist; real policies render; recording a new policy
  calls the real mutation with the correct variables and the new policy
  appears after refetch. Uses a real, non-mock-recognized UUID as the
  route id specifically to prove this tab queries the real route
  parameter, not a value the mock lookup would happen to resolve.
- e2e coverage added to `frontend/e2e/gap-analysis-a4-a8.spec.js`: staff
  records a real policy against a real patient fixture, using a
  directly-inserted `Payers` row (`createPayer` is `super_admin`-only
  and no seeded super_admin demo account exists — a direct SQL insert,
  matching this suite's own established pattern for fixture data the
  real API/UI can't create).

## What this does not close

No policy edit/deactivate UI (the backend has neither yet). No OCR
pre-fill or eligibility badges — both explicitly P1 per `REQ031`'s own
phase assignment.
