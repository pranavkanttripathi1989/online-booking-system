---
id: TR209
type: improvement
feature: reviews
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ149
related: [PLAN189, TP209]
commit: pending
---

# TR209 — Test results: review submission + post-visit request loop (P1-06)

## Backend — unit

`npx jest --maxWorkers=2` (full backend suite): **102/102 suites,
1696/1696 tests**, `tsc --noEmit` clean, `eslint "src/**/*.ts"` clean.
Includes: `reviews.service.spec.ts` — 23/23 (16 new cases under
`create — patient submission` and `hasReviewForAppointment`);
`reviews.resolver.spec.ts` — 8/8 (2 new: the `patient`-only gate on
`submitReview`, argument passthrough); `appointments.service.spec.ts` —
99/99 (4 new cases under `transitionStatus — completed dispatches a
new_review notification`); `public.service.spec.ts` — 26/26 (2 new
under `getClinician rating (P1-06)`).

## Backend — integration (real Postgres, real auth guard chain, from the host)

`cd backend && npm run test:int`: **6/6 suites, 398/398 tests**. New
`reviews-submission.int-spec.ts` — 8/8:

- `has_review` reads `false` before any review exists
- rejects a review for a not-yet-completed appointment
- rejects a different patient's attempt to review this appointment
  (Hard Rule 6, exercised via a newly-added `patientB` actor — no
  cross-org patient actor previously existed in `test/integration/setup/
  actors.ts`, since nothing before this slice needed one)
- the real patient can submit a review for their own completed
  appointment
- `has_review` flips to `true` once a review exists
- a second submission is rejected as a clean conflict, not a raw
  constraint error
- a non-patient caller (a manager) is rejected by the real role gate
- `getClinician` (public dialect) reflects the real rating/review count

`booking-concurrency.int-spec.ts` and `booking-hold-and-idempotency
.int-spec.ts` (both pre-existing from earlier slices) re-confirmed
unaffected — 1/1 and 3/3. `matrix-coverage.int-spec.ts` still 4/4 — the
new `submitReview` mutation landed on the already-classified `reviews`
domain, no new matrix row needed, confirmed directly rather than
assumed.

## Frontend

`CI=true npx jest src/pages/patient/Appointments.test.jsx --maxWorkers=1`:
**5/5 passed** (new file — no prior test coverage existed for this page
at all). Covers: "Leave a Review" button appears for a completed
appointment without one and opens the dialog; a "Review submitted" chip
(not a button) when `has_review` is already true; `Submit Review` stays
disabled with explanatory text until both a rating and comment are given
(`UI-11`); zero axe-core violations on the open dialog; a successful
submission calls the mutation with the right variables and shows success
feedback.

A real Apollo/MockedProvider gotcha found and fixed while writing this
file, not previously hit anywhere in this codebase: a `cache-and-network`
query returning nested objects with their own `id` fields resolves to
**empty data with no visible error** in `MockedProvider` unless every
nested mock object carries an explicit `__typename` — `addTypename={false}`
is deprecated in the installed Apollo Client version (confirmed via the
library's own deprecation warnings in the test output) and has no effect.
Fixed by adding `__typename` to every nested fixture object
(`Appointment`, `AppointmentPatient`, `AppointmentClinician`,
`ClinicianTypeInfo`, `AppointmentClinic`, `AppointmentRoom`,
`AppointmentService` — all real GraphQL type names, confirmed against
`appointment.entity.ts`/`user.entity.ts` directly, not guessed). Before
the fix: the query silently resolved to an empty appointments list, no
error anywhere, "No past appointments" rendered as if genuinely correct.

`npx eslint . --max-warnings 99999`: **1,906 warnings, 0 errors** —
unchanged from the existing ratchet baseline; this slice's new code
contributes zero new warnings (verified the pre-existing hex-color/
unused-import warnings on touched files predate this diff via
`git diff`).

`npx size-limit`: all three budgets green (initial bundle 327.86 kB /
335 kB; largest lazy chunk 109.92 kB / 115 kB; initial CSS 13.5 kB /
18 kB — unchanged from the last measured run, this slice added no new
route chunk).

`npm run build`: succeeded, 57.40s.

`CI=true npx jest --maxWorkers=2` (full frontend suite, run in the
background): **31/32 suites passed, 219/221 tests passed**. The one
failing suite, `clinician/EncounterWorkspace.test.jsx`, is the same
pre-existing resource-contention-flaky file already documented elsewhere
in this codebase's history (timeouts under full-parallel load, not
related to any file this slice touched) — `Appointments.test.jsx` (this
slice's own new file) is not among the failures, confirming its 5/5 in
isolation held under full-parallel contention too.

## Deliberately not covered

A live-browser pass of the review dialog's visual behaviour (the star
`Rating` component) — no browser-automation tool was available this
session. Logged as a stated gap, matching TP209's own account.

## Verdict

All acceptance criteria in REQ149 met and verified against the real
backend (real auth guard chain, real self-scoping, real unique
constraint) and the real frontend build — not just mocked-Prisma unit
coverage.
