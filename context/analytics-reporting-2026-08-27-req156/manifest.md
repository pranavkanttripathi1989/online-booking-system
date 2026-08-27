---
id: CTX-analytics-reporting-2026-08-27-req156
type: improvement
feature: analytics-reporting
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ156
related: [PLAN197, TP217, TR217]
---

# analytics-reporting — denial analytics + payer scorecards (2026-08-27)

Phase 2 slice **P2-04** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`)
— depends on `P2-03` (`REQ155`), which shipped the real
`ClaimAppeals.denial_category` and decision timestamps this report
reads. Its own tracker note ("`Claims` data model already there")
undersold the real dependency: `ClaimAppeals` did not exist until this
session's prior slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ156 | [Denial analytics + payer scorecards](../../requirements/analytics-reporting/improvement/REQ156-analytics-reporting-2026-08-27-denial-analytics-and-payer-scorecards.md) |
| implementation-plans | PLAN197 | [implementation plan](../../implementation-plans/analytics-reporting/improvement/PLAN197-analytics-reporting-2026-08-27-denial-analytics-and-payer-scorecards.md) |
| test-plans | TP217 | [test plan](../../test-plans/analytics-reporting/improvement/TP217-analytics-reporting-2026-08-27-denial-analytics-and-payer-scorecards.md) |
| test-results | TR217 | [results](../../test-results/analytics-reporting/improvement/TR217-analytics-reporting-2026-08-27-denial-analytics-and-payer-scorecards.md) |

## What shipped

- `AnalyticsService#getClaimAnalytics` — claim counts by status, an
  approval rate over *decided* claims only, a recovery rate
  (approved ÷ claimed), a real denial-category breakdown sourced from
  each rejected claim's own drafted appeal, and per-payer scorecards
  (approval rate, average decision days, recovery rate).
- Same org-scoping idiom `insurance.service.ts`'s own `claimsOrgScope`
  established (`{appointment: orgScopeVia(user, 'clinic')}`), reused
  inline — `Claims` has no `client_org_id`/`clinic_id` of its own.
- A new "Claim Analytics" section on `manager/reports/index.jsx`,
  matching that page's existing card/table styling exactly.
- The page's **first test file** — `index.test.jsx` did not exist
  before this slice.

## Design decisions worth knowing before touching this again

1. Approval rate is computed over decided claims (`approved + rejected
   + settled`), never the raw total — a pending-heavy window would
   otherwise understate the real rate.
2. A rejected claim with no `ClaimAppeals` row (predates `P2-03`) is
   excluded from the denial breakdown, never guessed into `'other'`.
3. `avgDecisionDays` is `undefined`, not `0`, for a payer with no
   decided claims yet in range — an honest "not enough data" state the
   frontend renders as an em dash.
4. `denial-classification.ts`'s labels are imported directly (a plain
   TS import of a dependency-free pure module, not a service
   injection) — no circular-module risk, no re-derived lookup table.

## Verification

Backend: 117/117 unit suites, 1896/1896 tests (11 new); integration
9/9 suites, 414/414 tests (no new tenancy-matrix domain needed);
`tsc`/`eslint` clean. Frontend: 5/5 in the page's first-ever test file;
lint ratchet raised 4842→4851 (pre-existing warning class only); build
+ `size-limit` green. See TR217 for the full account.

## What this closes

This is the fourth of the six named slices in
`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s tracker to
ship (`P2-02`, `P2-03`, `P2-04`, alongside the earlier Phase 1 batch).
`P2-01` remains blocked on ABDM `P1-10`; `P2-05`/`P2-06` (the other two
"carries the phase" slices) remain future work.
