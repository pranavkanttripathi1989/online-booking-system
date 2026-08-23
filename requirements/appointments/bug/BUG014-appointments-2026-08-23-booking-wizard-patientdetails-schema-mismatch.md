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
availability data when reached with a real `?doctor=` id, but three
independent defects in the same file still let every real submission fail
or let a fake one through undetected. Live-reported by the user pasting
three separate real GraphQL errors from manual testing — fixing each
surfaced the next as soon as a real submission got past it.

## Defect 1 — extra fields on `patientDetails`

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

## Fix (defect 1)

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

## Defect 2 — `type` sent an unrecognized value

Same file, one field over: `type: bookingData.appointmentType` sends the
`ToggleButtonGroup`'s own local value (`'inperson'`, no underscore, from the
`<ToggleButton value="inperson">` at line 458 and the `bookingData` default
at line 311) straight through. `BookPatientAppointmentInput.type` validates
with `@IsIn(['in_person', 'video', 'home_visit'])` — `'inperson'` isn't a
member, so the DTO's `ValidationPipe` rejected the request with
`BAD_REQUEST`/`type must be one of the following values: in_person, video,
home_visit`. `'video'` (the toggle group's other option) already matched by
coincidence, which is why this stayed hidden until the user specifically
tried the in-person path after `patientDetails` was fixed.

## Fix (defect 2)

Map at the same mutation-call boundary, not by renaming the UI's internal
state everywhere (`appointmentType` also drives a `textTransform: capitalize`
summary label at line 696 — switching the stored value to `'in_person'`
would render as "In_person Consultation"):

```js
type: bookingData.appointmentType === 'inperson' ? 'in_person' : bookingData.appointmentType,
```

## Defect 3 — the wizard was fully bookable with zero real data behind it

The root cause of the exact payload the user pasted
(`clinicianId: "mock-clinician"`, `productId: "svc-1"`): `/appointments/book`
visited with no `?doctor=` query string (`clinicianId` is `undefined`) fell
back to a hardcoded `{id: 'mock-clinician', name: 'Dr. Sarah Mitchell', ...}`
object in `renderStep0`, and a *second*, independently-hardcoded copy of the
same fake clinician in `renderStep3` (used by `PaymentForm`). Neither
`GET_CLINICIAN_AND_PRODUCTS` query was skipped only when
`clinicianId` was falsy, but the mock object was rendered in its place, and
nothing anywhere blocked the wizard from being filled out and submitted
against it. A separate mock-fallback in `renderStep2` compounded this: three
hardcoded fake services (`svc-1`/`svc-2`/`svc-3`) rendered whenever
`qData?.getProducts` was an empty array — an empty *real* result, not a
query error, treated the same as "no backend" (the same defect class
`BUG009`'s Priority 3 sweep already found and fixed in
`appointments/index.jsx`/`calendar/index.jsx`). A visitor could fill in
every step of a fully fake booking and only discover it was fake at the
very last click, `bookPatientAppointment` rejecting the fabricated
`clinicianId`/`productId` with `BAD_REQUEST`/`Clinician not found` (or,
had that check not existed, `Product not found` next).

## Fix (defect 3)

- Added a top-level guard in `BookingWizard`: if `clinicianId` is falsy,
  render a "No doctor selected" notice with a link back to `/`, before the
  stepper (and therefore the mock branches) ever render. `/appointments/book`
  is only ever meant to be reached with a `?doctor=` id (from
  `DoctorProfile`'s button, or a shared link) — there is deliberately no
  "browse all doctors then book" flow to redirect to instead, since no real
  public doctor-directory page exists yet (`pages/public/landing.jsx` is
  still 100% mock, a separate, pre-existing, already-documented gap).
- Removed both now-unreachable `mock-clinician` object literals
  (`renderStep0`, `renderStep3`) — dead code once the guard above makes
  `clinicianId` always real by the time either renders.
- Removed the mock-slots fallback in `availableSlots()` similarly — it
  checked `!qData?.getClinicianAvailability`, which (once `qLoading`/`qError`
  have already returned) can only be true if the field itself is missing,
  not merely empty; with `clinicianId` always real now, `qData` is always
  populated and this branch was already effectively dead. A real empty
  array now correctly falls through to the page's pre-existing "No
  availability for this date" empty state.
- Replaced `renderStep2`'s mock-products fallback (triggered on any real
  empty `getProducts` result, not just an error) with a real
  "no bookable services configured" info state — matching the fix pattern
  already established for the same "empty vs. error" defect class elsewhere
  in this codebase.

## Verification

Defects 1 and 2 independently reproduced and fixed against the real running
backend — reproduce the exact reported error via a direct `curl` GraphQL
call with the pre-fix payload shape, apply the fix, re-run the identical
call with the corrected shape and confirm a real created appointment id.
Both rounds' verification rows were deleted from the dev database
afterward. Defect 3 confirmed via a direct query for the real demo
clinician's `getClinician`/`getProducts` fields (both populated — the real
data the wizard now renders once past the guard) plus a full-file `eslint`
pass (0 errors; the 2 remaining warnings pre-exist this change, confirmed
via `git diff`). See `TR061`.

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
  construction, `renderStep2`'s empty-products state, or the top-level
  `!clinicianId` guard — only ad hoc live-verification calls and the
  pre-existing e2e specs, none of which exercised any of these three paths
  before. A future change could reintroduce any of them with no unit-level
  guard rail; only e2e coverage would catch it.
- Did not audit whether `bookAppointment`/`createAppointment` (the
  authenticated, non-public booking paths) have the same class of "extra
  local-state field sent verbatim" or "empty-result-treated-as-mock-fallback"
  risk — out of scope for this specific live-reported chain, but the same
  pattern is worth checking there.
- No real public "find/browse a doctor" page exists to link the new
  "No doctor selected" guard's CTA to something more specific than `/` —
  it links to the landing page, which is itself still 100% mock
  (pre-existing, documented separately in `CLAUDE.md`'s frontend
  mock-fallback section). Not addressed here.
