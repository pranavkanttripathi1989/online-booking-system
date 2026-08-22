---
id: BUG013
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG012]
---

# BUG013 — Frontend unit tests for AuthContext, the route guards, booking-wizard validation, and the date/currency formatters

## Severity

S3 (process/coverage gap, not a live defect) — with one real, previously-latent
test-design bug found and fixed while writing the coverage this slice adds
(see "What writing these tests found," below).

## How this was found

Second of three sequenced slices to finish `project-plans/06-execution-plan.md`'s
P1 ("prove the boundary") — the first (the backend tenancy matrix, `BUG012`)
is done. P1.6 is: "Frontend unit tests where risk concentrates: `AuthContext`,
`ProtectedRoute`/`RoleGuard`, booking-wizard validation, currency/date utils;
real `collectCoverageFrom` and thresholds." Before this slice, the frontend
had exactly one test file (`PermissionMatrix.test.jsx`, a presentational
component needing no providers) and `jest.config.cjs` had no
`collectCoverageFrom`/`coverageThreshold` at all.

## What writing these tests found

**A real, order-dependent test-authoring bug, caught before it shipped.**
Writing the idle-timeout auto-logout tests for `AuthContext.jsx`, the login
button in the test's own consumer component called `login(token, user)` with
no fourth `sessionTimeoutMinutes` argument. `login()`'s real logic (correct,
matching `REQ012`/`PLAN021`'s intent) clears any pre-existing
`medibook_session_timeout_minutes` value whenever that argument is omitted —
a login response with no org-configured timeout must not leave a stale
timeout from a previous session active. The test had independently
`localStorage.setItem('medibook_session_timeout_minutes', '1')`ed *before*
calling `login()`, so the very call meant to exercise the timeout silently
erased it, and no timer was ever scheduled — surfacing as a flaky-looking
failure that flipped between two different tests depending on run order,
which briefly looked like a jest-fake-timers/React-18 interaction bug before
tracing it back to this. Fixed by threading the timeout minutes through the
real `login()` call itself, matching how it actually arrives in production
(the org's Auto-logout setting, returned in the login/verifyTotpLogin
response) — not a separate, independently-seeded value.

**A confirmed, pre-existing, out-of-scope accessibility gap.** The booking
wizard's variation `<Select>` (step 2, variable-priced products) has no
`id`/`labelId` wiring between its `<InputLabel>` and `<Select>` — confirmed
by reproducing the exact same unlabeled markup in an isolated MUI probe using
the identical (unwired) pattern the real component uses. The `<Select>`'s
`role="combobox"` therefore has no accessible name in the real DOM, not just
in the test. Tests query it by role alone (only one combobox is ever on
screen in this flow) rather than by name — the gap itself is left as a real,
noted, but out-of-scope minor accessibility defect, not silently worked
around as if it were correct.

## What was built

- `src/utils/dateTime.test.js` — all 12 exported formatters, including
  `formatRelativeTime`'s four time buckets and every formatter's falsy-input
  fallback branch. 100%/97.9%/100%/100% (stmts/branches/funcs/lines).
- `src/components/ProtectedRoute/{ProtectedRoute,RoleGuard}.test.jsx` —
  loading/redirect/authenticated states; role-match/no-match/Forbidden403
  (including its "unknown" fallback and "Go Back" history navigation).
  100%/92.3%/100%/100% combined.
- `src/context/AuthContext.test.jsx` — initial hydration (no token / cached
  user / ME_QUERY-only), the F-02 regression (a rejected ME_QUERY logs out,
  never falls back to a cached user), `login`/`logout` storage behavior,
  `hasRole`/`hasPermission`, and the idle-timeout auto-logout effect.
  81.3%/65%/86.4%/85.7% — "where risk concentrates" coverage, not a 90% target.
- `src/pages/booking/index.test.jsx` — the "Next Step" validation gate across
  all three of its steps (real slot selection, all four required patient
  fields individually, the phone field's real non-enforcement despite its
  `required` UI attribute, simple-vs-variable product/variation gating) —
  same scope, "where risk concentrates," not a fixed target.
- `jest.config.cjs` — `collectCoverageFrom` now measures the whole `src`
  tree; `coverageThreshold.global` is a ratchet floor set to the real
  measured baseline (2.4/1.6/1.7/2.7% stmts/branches/funcs/lines — see
  `TR060`), with per-path 90% overrides on the two guard/formatter targets.

## Verification

`npm test` (frontend): 6 suites, 63 tests, all green. `npm test -- --coverage`:
all thresholds pass, including the two 90%+ per-path overrides. `npm run
lint`: 177 warnings (this repo's existing ratcheted baseline, unchanged), 0
errors, no new warnings on any touched file. See `TR060`.

## What this does not close

- P1's remaining item (1.5: a realistic seed dataset + a separately seeded
  e2e database) is the third sequenced slice, not started here.
- The booking wizard's unlabeled `<Select>` (see above) is a real, minor,
  pre-existing accessibility gap this slice found but did not fix — out of
  scope for a test-writing pass.
- `AuthContext.jsx` and `pages/booking/index.jsx` are only partially covered
  (81%/expected-low respectively) — by design, per the DoD's own "where risk
  concentrates" framing rather than a 90% bar on files this large.
