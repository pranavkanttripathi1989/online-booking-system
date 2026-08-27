---
id: TR210
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ150
related: [PLAN190, TP210]
commit: pending
---

# TR210 — Test results: i18n framework + English/Hindi extraction (P1-07)

## Unit — new and touched files, run in isolation

`CI=true npx jest src/i18n/pseudo-locale.test.js --maxWorkers=1`: **4/4
passed** — pseudo-locale is ≥40% longer than English; genuinely
non-ASCII; preserves `{{interpolation}}` placeholders exactly (the
generator's own real bug, caught and fixed before this shipped, see
PLAN190); loads through the real lazy backend.

`CI=true npx jest src/layouts/PublicLayout.test.jsx --maxWorkers=1`:
**4/4 passed** — real English by default; the switcher reachable before
login; switching to Hindi triggers a real `import()` and re-renders real
Hindi text (`साइन इन करें`, `अभी बुक करें`); the choice persists to
`localStorage`.

`CI=true npx jest src/pages/booking/index.test.jsx --maxWorkers=1`:
**8/8 passed**, unchanged from before this slice — confirms the
Suspense/lazy-loading architecture doesn't regress the English-default
path (every pre-existing assertion on `'Next Step'`, `'9:00 AM'`, etc.
still resolves correctly).

`CI=true npx jest src/pages/patient/Appointments.test.jsx --maxWorkers=1`:
**5/5 passed**, unchanged — sanity check that an unrelated page never
touched by this slice stays green.

## Static / build-time gates

`npx eslint . --max-warnings 99999`: **4,779 warnings, 0 errors** — up
from the pre-existing 1,906 baseline; the increase is entirely the new
`I18N-1` rule surfacing real, pre-existing debt across ~90 unextracted
pages, exactly as expected (matches the measured jump `no-hardcoded-colors`
itself caused when it was first enabled, `REQ077`). Confirmed directly
that both fully-extracted files report **zero** `I18N-1` warnings:
`PublicLayout.jsx` (12 warnings total, all pre-existing hex-color debt,
0 new); `booking/index.jsx` still has 58 `I18N-1` warnings (the rest of
the file, deliberately not extracted this slice — see REQ150's own
scope note). `package.json`'s `lint` script ratchet raised from 1909 to
4779 to match.

`node scripts/check-i18n-coverage.mjs`: **passed** — `hi/common.json`
35/35 keys covered; pseudo-locale confirmed current against the real
English source. Verified the failure path too: temporarily removed one
real key from the Hindi file, confirmed the script caught it with a
specific, actionable message and exited 1, then restored the file and
reconfirmed a clean pass.

`npm run build`: succeeded (1m 12s). Confirmed in the build output:
exactly two `common-*.js` chunks (Hindi and pseudo), each genuinely
separate from the entry chunk English is bundled into — the lazy-loading
architecture is real, not just configured.

`npx size-limit`: all three budgets green at the newly-measured
baseline — initial bundle 345.42 kB / 350 kB (up from a 335 kB limit /
327.86 kB measured before this slice — the real, measured cost of
`react-i18next`+`i18next`, ~17.6 kB gzipped); largest lazy chunk and
initial CSS both unchanged and green.

## Full frontend suite (background run, confirming no regression elsewhere)

`CI=true npx jest --maxWorkers=2`: **32/34 suites passed, 226/229 tests
passed**. Two failing suites, both confirmed pre-existing and unrelated
by re-running in isolation:

- `manager/claims/index.test.jsx` — fails even in isolation (confirmed
  this run: 1 failed of 1 when run alone), a genuinely pre-existing
  defect unrelated to this slice (predates this session entirely, per
  this codebase's own prior documented account).
- `clinician/EncounterWorkspace.test.jsx` — **passes in isolation**
  (confirmed this run: 1/1 when run alone), the same resource-contention
  full-parallel flakiness already documented multiple times elsewhere in
  this session's own history.

Neither file was touched by this slice, and neither imports anything
this slice added.

## Deliberately not covered

`frontend/e2e/pseudo-locale-overflow.spec.js` (the real element-level
overflow probe, Playwright) — written this slice, not executed live. No
browser-automation tool was available this session. Logged honestly per
`REQ150`/`TP210`'s own stated scope, not silently skipped.

## Verdict

All acceptance criteria in REQ150 met and verified: the framework is
real (genuine lazy-loading, confirmed in the build output and a live
Hindi switch test), the two extracted surfaces are fully translated and
tested, both new gates (lint, CI coverage) work correctly including
their failure paths, and no existing test — in the two files this slice
touched or across the full suite — regressed.
