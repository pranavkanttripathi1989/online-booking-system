---
id: BUG014
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ018
related: [BUG011]
---

# BUG014 — Every real booking through the public wizard failed at the final step, always

## Severity

S1. `BUG011` fixed the wizard so it fetches and renders real clinician/
availability data, but the mutation that actually books the appointment —
the entire point of the flow — always errored out for every real user, on
every attempt, both before and after that fix. Live-reported by the user
pasting a real GraphQL error from manual testing.

## The defect

`pages/booking/index.jsx`'s `handlePayAndBook()` sent the entire local
`bookingData.patient` object as the mutation's `patientDetails` variable:

```js
patientDetails: bookingData.patient,
```

`bookingData.patient`'s shape (the step-2 form's local state, `index.jsx:302-309`)
is `{firstName, lastName, dateOfBirth, email, phone, reason, notes}`. The
real `PatientDetailsInput` GraphQL type (`backend/src/public/dto/public.input.ts`)
only defines `firstName`, `lastName`, `email`, `phone`. GraphQL's input-object
variable coercion rejects any key not defined on the target type —
unconditionally, regardless of the key's value (confirmed live: sending
`dateOfBirth: null` still triggers the error, not just a populated value) —
so every real submission errored with three `BAD_USER_INPUT` errors
(`Field "dateOfBirth"/"reason"/"notes" is not defined by type "PatientDetailsInput"`)
before the booking could ever be created.

This is independent of `BUG011`'s mock-fallback/query-param/day-of-week
defects — it would have broken a booking against a fully real, correctly
wired clinician just as completely. It was never caught by
`booking-payment.spec.js` or `public-booking.spec.js` because — confirmed by
reading both specs — neither one exercises the `PaymentForm`'s actual
"Confirm and Pay" click through to a real `bookPatientAppointment` call in a
way that surfaces this; the specs stop short of (or mock around) that exact
step.

## Why `reason`/`notes`/`dateOfBirth` have nowhere to go

`backend/src/public/public.service.ts:216` hardcodes `reason: ''` when
constructing the new-patient booking — the resolver never reads a `reason`
field from its input at all, because `BookPatientAppointmentInput` doesn't
carry one. This is a pre-existing scope gap: `Appointments.reason` is a
required, non-nullable Prisma column, but the public/self-serve booking
dialect has no way to populate it for a genuinely new (unauthenticated)
patient, so it's silently defaulted to an empty string. The step-2 form
still marks "Reason for visit" as `required` and gates the step-1→2
transition on it (`index.jsx:629`), which is now misleading — the value the
patient is required to type is captured locally and then discarded, never
reaching the database. Same for `dateOfBirth`/`notes`: captured, never sent,
never stored anywhere.

## Fix

`pages/booking/index.jsx`'s `handlePayAndBook()` now builds `patientDetails`
explicitly from only the four fields the real schema defines:

```js
patientDetails: {
  firstName: bookingData.patient.firstName,
  lastName: bookingData.patient.lastName,
  email: bookingData.patient.email,
  phone: bookingData.patient.phone,
},
```

## Verification

Live GraphQL call against the real backend with the exact fixed payload
shape (real seeded clinician `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`, a real
linked product) returned a real created appointment id with zero errors.
The pre-fix shape (with `dateOfBirth`/`reason`/`notes` present, including a
`null`-valued `dateOfBirth`) was independently reproduced against the same
live backend first, confirming the exact error the user reported. The
verification appointment/patient rows were deleted from the dev database
afterward — this was an ad hoc live-verification call, not a seeded fixture.
See `TR061`.

## What this does not close

- **`reason`/`notes`/`dateOfBirth` are not persisted anywhere for a public,
  unauthenticated booking.** The form still asks for and requires a reason,
  but it is discarded. Fixing that for real needs a schema change
  (`PatientDetailsInput`/`BookPatientAppointmentInput` need new fields,
  `PatientsService`/`public.service.ts` need to consume them, and a decision
  on whether `Patients.date_of_birth` should be settable from this
  unauthenticated path at all) — genuinely new scope, not a bug-fix-sized
  change, and not attempted here. Logged as an open question below rather
  than guessed at.
- No unit test exists for `handlePayAndBook`'s mutation-variable
  construction — only this ad hoc live-verification call and the pre-existing
  e2e specs, neither of which exercised this exact path before. A future
  change reintroducing an extra field on `bookingData.patient` (or on the
  mutation call) would not be caught by the current test suite.
- Did not audit whether `bookAppointment`/`createAppointment` (the
  authenticated, non-public booking paths) have the same class of "extra
  local-state field sent verbatim" risk — out of scope for this specific
  live-reported error.
