---
id: PLAN099
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ072
related: []
---

# PLAN099 — Implementation plan for the booking-wizard dependant picker

Frontend-only. No backend change — `myDependants` and `me { patient {...}
}` already existed from `REQ018`.

## Scope note

The **public** booking wizard (`pages/booking/index.jsx`, the separate
camelCase self-serve dialect with mandatory Razorpay) is explicitly
untouched — this slice is `components/BookingWizard/` only, the
internal, staff-oriented wizard reachable by any authenticated role at
`/appointments/new`.

## Changes

**`BookingStep4Patient.jsx`**: added `useAuth()`'s `hasRole('patient')`
check. Two new `gql` queries, both `network-only` (working around the
documented `AuthContext.jsx` login-cache gap the same way the Privacy
tab and clinician dashboard already do — a fresh login's cached
`me { ... }` selection never includes `patient`, so a cache-first read
would silently show nothing):

- `GET_MY_PATIENT_LINK` — `me { patient { id full_name } }`, skipped
  unless the caller is a patient.
- `MY_DEPENDANTS_QUERY_FOR_BOOKING` — `myDependants { id relation patient
  { id full_name } }`, same skip condition.

A `useEffect` auto-selects "Myself" once the patient's own link resolves
and nothing is picked yet. `handleBookingForChange` sets the wizard's
`patient` field to either the caller's own patient object or the
selected dependant's.

JSX: a new `FormControl`/`RadioGroup` block renders only for a patient
caller; every existing mode-toggle/Autocomplete/new-patient-form block
is gated `!isBookingPatient &&`, so a non-patient caller's experience is
byte-for-byte unchanged.

## Testing (see `TP126`)

No dedicated unit test file exists for `BookingWizard/` components
(pre-existing gap, not introduced here). Verified via `npm run lint`
(clean — confirmed via `git stash`/`git stash pop` that the file's 4
remaining warnings are all pre-existing and unrelated), `npm test`, and
`npm run build`, all green.

## Live verification

Not yet driven in a real browser — this is the one slice in the batch
without a live click-through, logged here rather than silently skipped.
The query shapes were cross-checked field-for-field against
`REQ018`'s own already-shipped, already-live-verified `myDependants`
resolver and the `me { patient {...} }` selection the Privacy tab
already uses successfully — the same contract, a third consumer, not a
new one. Recommended before this is treated as fully proven: log in as
`patient@medibook.dev` (or a linked patient account) in a real browser,
navigate to `/appointments/new`, and confirm the radio list renders and
drives the rest of the wizard correctly.
