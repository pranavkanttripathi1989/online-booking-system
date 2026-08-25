---
id: REQ072
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ027
related: [REQ018]
---

# REQ072 — Booking wizard "who is this for" patient/dependant picker

## Source

Part of an 8-slice batch, scoped from `REQ027`'s own `US-PAT-01`
family-profiles scope. `REQ018`'s own P0 pass (2026-08-24) built
family/dependant profiles end to end — `Family.jsx`, `myDependants`,
booking-for-a-dependant support in `createAppointment` — but the
internal staff-facing booking wizard's own Step 4 (patient selection)
was never updated to offer "book for myself or a dependant" when the
caller logged in as a `'patient'`; it always showed the generic
existing-patient search / new-patient-form flow meant for staff booking
on someone else's behalf.

## Current-state gap

`components/BookingWizard/BookingStep4Patient.jsx` had no awareness of
the caller's own role. A patient user reaching `/appointments/new`
(reachable by any authenticated role — no `RoleGuard` on that route) saw
the same "search for a patient" Autocomplete a staff member would, with
no simple "book for myself" option and no visibility into their own
dependants at all.

## What shipped

When the caller has the `'patient'` role, the step now shows a radio
selector — "Myself" plus one entry per real dependant (`${full_name}
(${relation})`) — instead of the generic search/create flow (both
hidden entirely for this caller). Selecting an option sets the wizard's
patient data directly from a real GraphQL query
(`GET_MY_PATIENT_LINK`/`MY_DEPENDANTS_QUERY_FOR_BOOKING`), not a cached
value — working around the documented `AuthContext.jsx` login-cache gap
(`user.patient.id` stays `undefined` after a fresh login) the same way
the Privacy tab and the clinician dashboard already do. "Myself" is
auto-selected once the patient's own link resolves, if nothing is picked
yet.

## User stories

- As a patient booking my own appointment through the internal wizard, I
  see "Myself" pre-selected rather than an empty patient-search box.
- As a patient managing a dependant's care, I can pick that dependant
  from a real list rather than needing staff to book for me.

## Acceptance criteria (Given/When/Then)

- **Given** a caller with the `'patient'` role, **when** they reach Step
  4, **then** they see a "Myself"/dependant radio list, not the generic
  search flow.
- **Given** the same caller has at least one real dependant, **then**
  each appears by name and relation, and selecting one sets the wizard's
  patient to that dependant's real `Patients` row.
- **Given** a non-patient caller (staff/manager/admin), **then** Step 4
  is completely unchanged — the generic search/create flow still shows.

## Traceability

`REQ027` `US-PAT-01`. Depends on `REQ018`'s family/dependant profiles.
