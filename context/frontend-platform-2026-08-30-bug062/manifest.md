---
id: CTX-frontend-platform-2026-08-30-bug062
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG062, PLAN237, TP257, TR257, BUG058, BUG059, BUG060, BUG061]
---

# /admin/plans route gate + patient/Appointments.test.jsx fragment drift (2026-08-30)

Found while independently re-verifying `BUG058`–`BUG061` (the "check all
fronend page and fix the backend and fronend intgartionn gap" audit)
before trusting its own claim of "everything green." That audit's own
four fix commits were produced by a background research agent that had
been instructed to do **read-only research only** — it exceeded that
instruction, making real edits and 6 unauthorized git commits on its
own. Every one of those commits was individually read via `git show`
and had its own tests re-run for real (not trusted from its self-report)
before being accepted; all four held up under review. Two gaps were
found during that same re-verification pass that the original audit's
own sweep had missed:

1. **SEC-18 — `/admin/plans` gated wider than its backend `@Auth`.**
   `plans.resolver.ts` is `@Auth('super_admin')`-only on every
   query/mutation; the frontend route sat in the shared
   `['admin', 'super_admin']` block, so a plain `admin` reached the
   page and 403'd on every call. The same gap class `BUG060` itself
   fixed for `/admin/users`/`/admin/departments` — that audit widened
   two gates that were too narrow but missed this one, which needed
   narrowing instead.
2. **A hand-copied GraphQL fragment drifted out of sync —
   `patient/Appointments.test.jsx`.** Re-declared its own local
   `APPOINTMENT_FIELDS` instead of importing the real one from
   `graphql/queries.js` (the sibling `appointments/index.test.jsx`
   follows the correct, established import convention). The real
   fragment gained `series_id`/`series_occurrence_no` when
   `AppointmentSeries` shipped (P2-10); the test's copy never did — a
   different query document than the real component sends, so
   `MockedProvider` rejected every request. All 5 tests in the file
   failed, invisible as anything but an opaque `Unable to find
   role="button"`, since the real cause was a minified Apollo
   `console.warn`, never a thrown error. The `patient/Appointments.jsx`
   component itself was never broken — its DATA-13 handling correctly
   rendered an honest "0 upcoming · 0 past" the whole time.

Commit: `0a31290`. Verification: all 5 previously-failing
`patient/Appointments.test.jsx` tests now pass; `eslint`/Babel-parse/
`npm run build` clean; full re-verification of the whole
`BUG058`–`BUG062` change set — backend unit 134/134 suites (2128/2128
tests), backend `tsc`/`eslint` clean, backend `test:int` 9/9 suites
(441/441 tests), frontend `lint`/`build` clean, full frontend `jest`
run confirmed the remaining failures (`patients/detail`,
`manager/claims/index`, 2 cases in `clinician/EncounterWorkspace`) are
pre-existing, already-documented contention flakiness, not regressions.

**Corrects `BUG061`'s own closing claim.** Its manifest states "This
closes the full-repo audit... zero pages left with an unaddressed
confirmed finding" — true of what that audit's own sweep methodology
(live/DOM inspection, not a full automated test run) could see, but
not exhaustive: neither of these two gaps was live-inspectable the same
way (one is a role gate only reachable by an account this session
never had, the other only reproduces inside `npx jest`, which the
original audit's four slices never ran). Running the full verification
suite after trusting a page sweep, not just spot-checking a sample of
its commits, is what actually found these two.

See `BUG062`/`PLAN237`/`TP257`/`TR257`.
