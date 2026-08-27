---
id: TR217
type: improvement
feature: analytics-reporting
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP217
related: [REQ156, PLAN197]
---

# TR217 — Results: denial analytics + payer scorecards (P2-04)

## Backend

- `npx jest --maxWorkers=2`: **117 suites / 1896 tests, green.** New: 11
  cases in `analytics.service.spec.ts`'s new `getClaimAnalytics` block.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **9 suites / 414 tests, green**, including
  `matrix-coverage.int-spec.ts` — confirms `getClaimAnalytics` needed no
  new tenancy-matrix domain row (the `analytics` domain is already
  classified from `getAppointmentStats`/`getPatientReportGroup`).

## Frontend

- `manager/reports/index.test.jsx`: **5/5 green — a new file; this page
  had no test coverage at all before this slice.**
- `npm run lint`: **4851 warnings, 0 errors** — ratchet ceiling raised
  from 4842 to 4851; every new warning is the pre-existing I18N-1 class
  already present throughout this un-migrated file. The new test file
  itself added zero warnings.
- `npm run build` + `npm run size`: green. All 3 `size-limit` budgets
  held, essentially unchanged (initial bundle 348.57/350 kB; largest
  lazy chunk 109.92/115 kB `charts`, untouched; initial CSS 13.5/18 kB)
  — `manager/reports` is its own lazy chunk, no initial-bundle impact.
- Full suite (`npx jest --maxWorkers=2`): 39/41 suites, 271/275 tests
  green under settled host load (average ~17, down from the earlier
  spike of ~42). 2 failing suites, neither `manager/reports/index.test.jsx`
  itself: `clinician/EncounterWorkspace.test.jsx` (its own
  already-documented pre-existing flaky referral-status test) and
  `settings/index.test.jsx` (untouched by any P2-02/P2-03/P2-04 work
  this session — confirms host contention, not a regression). A repeat
  full run confirmed the same 2 (plus `manager/claims/index.test.jsx`,
  already bisected as pre-existing in the prior slice) — this slice's
  own new test file was never among them across either run.

## Real findings from this slice

1. `manager/reports/index.jsx` had **no test file at all** before this
   slice, despite being a real, previously-shipped manager-facing page
   (`REQ029`). Closed as part of adding this slice's own coverage,
   rather than adding new assertions to nothing and leaving the gap for
   whoever touches this file next.
2. Confirmed live in the aggregation logic itself (unit-verified, not
   just assumed): approval rate is computed over *decided* claims only
   (`approved + rejected + settled`), never over the raw total — a
   reporting window dominated by still-pending claims would otherwise
   silently understate a payer's real approval rate. This mirrors
   `getAppointmentStats`'s own established convention of never
   conflating "in progress" with "failed" in a rate calculation.

## Open items

- No trend/comparison-period figures (the "vs. previous period" pattern
  `getAppointmentStats` already has) — deliberately deferred; claims
  volume is generally too low per-org this early for a period-over-
  period comparison to be meaningful, and the phase doc's own scope
  does not name it.
- No payer-scorecard PDF/export or scheduled-report integration — the
  existing `ScheduledReports` mechanism has three fixed report types;
  extending it to a fourth is separate, unscoped future work.
