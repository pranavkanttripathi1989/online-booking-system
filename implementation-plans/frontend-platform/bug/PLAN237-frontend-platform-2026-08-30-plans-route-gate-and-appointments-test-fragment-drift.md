---
id: PLAN237
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG062
related: [BUG062, TP257, TR257]
---

# PLAN237 — fix /admin/plans route gate + patient/Appointments.test.jsx fragment drift

## Scope

`frontend/src/App.jsx` (route regrouping only),
`frontend/src/pages/patient/Appointments.test.jsx` (test-only). No
backend change, no product-code change to `patient/Appointments.jsx`
itself — its render logic was already correct.

## Approach

1. **`App.jsx`**: moved `/admin/plans` out of the shared
   `['admin', 'super_admin']` admin-only block into its own dedicated
   `RoleGuard roles={['super_admin']}` block, matching `plans.resolver
   .ts`'s own `@Auth('super_admin')`-only gate on every query/mutation.
   `AdminLayout`'s own sidebar nav (`layouts/AdminLayout.jsx`) is left
   as-is — it already renders an unfiltered link list to whoever reaches
   any `AdminLayout`-wrapped route (a pre-existing, broader pattern, not
   specific to Plans, and not a security boundary since the route guard
   is); a plain `admin` clicking through now gets a real route-level
   redirect instead of a page that 403s on every GraphQL call.
2. **`patient/Appointments.test.jsx`**: replaced the file's hand-copied
   local `APPOINTMENT_FIELDS` fragment (missing `series_id`/
   `series_occurrence_no`, added to the real shared fragment by P2-10's
   `AppointmentSeries` work) with a direct import from
   `../../graphql/queries`, matching the sibling `appointments/
   index.test.jsx`'s own established, correct convention. Added the two
   fields to `baseAppointment()`'s fixture object for completeness (not
   load-bearing for the fix — `MockedProvider` doesn't validate `result
   .data` against the query's field selection — but keeps the fixture
   honest about the real shape).

## Root-cause note (why this was invisible)

`MockedProvider` rejects a query whose variables *and* document don't
match a registered mock with a `console.warn` (`No more mocked responses
for the query...`), not a thrown error — the test then simply times out
waiting for content that will never arrive, surfacing as `Unable to find
role="button" and name "Leave a Review"` with zero indication the real
cause was a fragment mismatch three files away. The DOM dump at failure
showed an honest, correctly-rendered "0 upcoming · 0 past" — proving
`patient/Appointments.jsx`'s own DATA-13 empty-vs-error handling was
never the problem; only the test's ability to supply matching data was
broken.

## Testing

- `patient/Appointments.test.jsx`: all 5 tests now pass (previously all
  5 failed) — verified with a direct `npx jest patient/Appointments
  --maxWorkers=1` run, not just trusted.
- `App.jsx`: `eslint` clean; a Babel transform of the file confirmed
  valid JSX syntax; `npm run build` succeeded end to end.
- Full re-verification of the wider `BUG058`–`BUG061` change set this
  slice grew out of: backend unit 134/134 suites (2128/2128 tests),
  backend `test:int` 9/9 suites (441/441 tests), backend `tsc --noEmit`
  and `eslint` both clean; frontend `lint` (0 errors, 3397 warnings,
  under the 4908 ratchet) and `build` both green. Full frontend `jest`
  run confirmed the only other failures (`patients/detail.test.jsx`,
  `manager/claims/index.test.jsx`, 2 tests in `clinician/
  EncounterWorkspace.test.jsx`) are pre-existing, already-documented
  resource-contention flakiness, not new regressions — each re-run
  alone (or, for the 2 `EncounterWorkspace` cases, confirmed to fail
  only on Jest's bare 5000ms default timeout under load, with no
  extended timeout declared for those two tests specifically).

See `TP257`/`TR257`.
