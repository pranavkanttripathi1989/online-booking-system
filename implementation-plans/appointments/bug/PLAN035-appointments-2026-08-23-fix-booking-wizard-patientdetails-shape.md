---
id: PLAN035
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG014
related: [BUG011, TP062, TR061]
---

# PLAN035 — Send only the fields `PatientDetailsInput` actually defines

Straightforward fix against an already-established real contract (the
`PatientDetailsInput` type itself) — no test-suggestions stage per `REQ013`
Phase D.

## 1. Stop sending the whole local form-state object as the mutation variable

**Approach:** `handlePayAndBook()` (`pages/booking/index.jsx`) sent
`patientDetails: bookingData.patient` — the entire step-2 form's local
state, including `dateOfBirth`/`reason`/`notes`, none of which exist on the
real `PatientDetailsInput` type. GraphQL's variable coercion rejects any
extra key on an input object, so this always errored before an appointment
could be created.

- Build the mutation's `patientDetails` explicitly:
  `{firstName, lastName, email, phone}`, picked off `bookingData.patient`
  rather than passed through wholesale.
- Do not add `reason`/`notes`/`dateOfBirth` fields to the input — the real
  schema has no field to carry them (`public.service.ts` hardcodes
  `reason: ''` regardless of what it's sent), and adding them is new scope,
  not a bug fix. Logged as open question #12 instead of guessed at.
- Leave the step-2 form itself unchanged (still captures and requires
  `reason`) — removing or relabeling those fields is a product decision
  tied to the same open question, not part of this fix.

## 2. `type` sent the toggle group's own local value, not a value the DTO accepts

**Approach:** `bookingData.appointmentType`'s stored value is `'inperson'`
(the `ToggleButtonGroup`'s own convention, no underscore); the real
`BookPatientAppointmentInput.type` validates against
`['in_person', 'video', 'home_visit']`. Found the same way as defect 1 — a
live-reported error from manual testing, immediately after defect 1 was
fixed and a real submission reached this field for the first time.

- Map at the mutation-call boundary only:
  `type: bookingData.appointmentType === 'inperson' ? 'in_person' : bookingData.appointmentType`.
- Did not rename the stored value itself — `appointmentType` also feeds a
  `textTransform: capitalize` summary label elsewhere on the page; renaming
  to `'in_person'` would render as "In_person Consultation".

## Verification plan

See `TP062`.
