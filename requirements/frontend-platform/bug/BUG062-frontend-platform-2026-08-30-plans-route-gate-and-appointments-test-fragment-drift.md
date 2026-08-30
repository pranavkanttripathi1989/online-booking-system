---
id: BUG062
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN237, TP257, TR257, BUG059, BUG060, BUG061]
---

# BUG062 — /admin/plans route gate too wide + patient/Appointments.test.jsx fragment drift

## How it was found

Independent verification of `BUG058`–`BUG061` (the "check all frontend
page and fix the backend and frontend integration gap" audit), done
before trusting that audit's own claim of "everything green" — every
fix commit read in full via `git show`, its own tests re-run for real
(not just trusted from the audit's self-report), then the complete
verification suite (backend unit, backend `tsc`/`eslint`, backend
`test:int`, frontend `lint`/`build`/full `jest`) re-run from scratch.
Both items below were found during that re-verification, not by the
original audit — they are gaps in what it covered, not regressions it
introduced.

## What was found and fixed

1. **SEC-18 — `/admin/plans` route gated wider than its backend
   `@Auth`.** `plans.resolver.ts` gates every query/mutation to
   `@Auth('super_admin')` exclusively (platform SaaS-subscription plan
   definitions — unlike every other route in the same admin-only block,
   which is org-scoped and available to a plain `admin` too). The
   frontend route sat in the shared `['admin', 'super_admin']` block,
   so a plain `admin` reached the page and got a real 403 on every
   GraphQL call. Same gap class as `BUG039`'s `/queue`/`/waiting-room`
   fix and `BUG060`'s own `/admin/users`/`/admin/departments` fixes —
   `BUG060` widened those two but missed this one, which goes the
   opposite direction (narrow, not widen). Fixed with a dedicated
   `RoleGuard roles={['super_admin']}` block around `/admin/plans`
   only, matching the existing dedicated-block pattern already used for
   `/test-results`.
2. **A hand-copied GraphQL fragment silently drifted out of sync —
   `patient/Appointments.test.jsx`.** The file re-declared its own local
   `APPOINTMENT_FIELDS` fragment instead of importing the real one from
   `graphql/queries.js` (its own header comment claimed this mirrored
   `booking/index.test.jsx`'s convention; the actual established
   convention, followed correctly by the sibling `appointments/
   index.test.jsx`, is to **import** the real fragment). The real
   fragment gained `series_id`/`series_occurrence_no` fields when
   `AppointmentSeries` shipped (P2-10); the test's copy never did. A
   different query document than the one the component actually sends
   means `MockedProvider` rejects every request with "no more mocked
   responses" — invisible in the failure output as anything but
   `Unable to find role="button" and name "Leave a Review"`, since
   Apollo's own error is a minified, easy-to-miss `console.warn`, not a
   thrown test failure. All 5 tests in the file failed this way, with
   the rendered page showing a real, honest "0 upcoming · 0 past" (DATA-13
   working correctly — the review-submission feature itself was never
   broken, only its test's ability to prove that was). Fixed by
   importing `APPOINTMENT_FIELDS` from `graphql/queries.js` instead of
   duplicating it, and adding the two new fields to the test's own
   `baseAppointment()` fixture for completeness. This is the second
   time in this codebase's history a hand-copied fragment has drifted
   this way (see `06-frontend-architecture-and-mobile.md`'s existing
   caution on fixture drift); the fix removes the drift surface
   entirely rather than just re-syncing the copy once more.

## Not fixed this slice

Re-ran the full frontend suite twice; `patients/detail.test.jsx`,
`manager/claims/index.test.jsx`, and 2 tests in
`clinician/EncounterWorkspace.test.jsx` failed under full-parallel
contention but passed cleanly (or, for `EncounterWorkspace`, failed
only on a bare 5000ms Jest default timeout with no extended timeout
declared) when re-run alone — confirmed pre-existing resource-contention
flakiness already documented in `CLAUDE.md`'s own account of prior
sessions (the same 3 files, among others, are named there), not a
regression from this slice or from `BUG058`–`BUG061`. Not touched.

See `PLAN237`/`TP257`/`TR257`.
