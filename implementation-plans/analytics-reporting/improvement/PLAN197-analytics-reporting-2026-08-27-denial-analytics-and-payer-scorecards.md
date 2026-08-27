---
id: PLAN197
type: improvement
feature: analytics-reporting
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ156
related: [REQ156, TP217, TR217]
---

# PLAN197 — Denial analytics + payer scorecards (P2-04)

## Backend

- `backend/src/analytics/entities/analytics.entity.ts` —
  `DenialCategoryPointType` (`category`, `categoryLabel`, `count`),
  `PayerScorecardType` (per-payer counts, `approvalRate`,
  `avgDecisionDays` nullable, `totalClaimAmount`/`totalApprovedAmount`/
  `recoveryRate` in rupees), `ClaimAnalyticsType` (overall totals plus
  both breakdown arrays).
- `backend/src/analytics/analytics.service.ts#getClaimAnalytics` —
  fetches `Claims` (`include: {payer, appeal}`) in the date range,
  scoped via the identical 2-level `{appointment: orgScopeVia(user,
  'clinic')}` nesting `insurance.service.ts`'s own `claimsOrgScope`
  established — duplicated inline rather than imported across modules
  for one filter object, matching this codebase's own tolerance for
  that trade-off (`public.service.ts`'s `OVERLAP_CONSTRAINT_NAMES` is
  the cited precedent). All aggregation is in-process over the fetched
  rows, the same shape `getAppointmentStats`/`getPatientReportGroup`
  already use:
  - Status counts, `approvalRate` computed over decided claims only
    (`approved + rejected + settled`), never over `totalClaims` (a
    majority-pending window would otherwise understate the real rate).
  - `totalClaimAmount`/`totalApprovedAmount` paise→rupees at this
    resolver boundary (Hard Rule 9's money convention);
    `recoveryRate = approved ÷ claimed`, `0` (not `NaN`) when nothing
    was claimed.
  - `denialCategoryBreakdown` — only from a `rejected` claim's own
    `appeal.denial_category` (`P2-03`); a rejected claim with no appeal
    row (data from before that slice existed) is excluded, not
    mis-bucketed into `'other'`.
  - `payerScorecards` — grouped by `payer_id`, sorted by `totalClaims`
    descending; `avgDecisionDays` computed only over claims with a real
    `decided_at`, left `undefined` (not `0`) when none exist yet for
    that payer in range — an honest "not enough data" state.
  - Imports `DENIAL_CATEGORY_LABELS`/`DenialCategory` directly from
    `../insurance/denial-classification` — a plain TS import of a
    dependency-free pure module (no Prisma/NestJS DI), not a
    cross-module service injection, so there is no circular-module risk.
- `backend/src/analytics/analytics.resolver.ts#getClaimAnalytics` —
  identical `@Auth('manager', 'admin', 'super_admin')` gate and
  `clinicId`/`startDate`/`endDate` argument shape as the two existing
  analytics queries.

## Frontend

- `manager/reports/index.jsx` — new `GET_CLAIM_ANALYTICS` query, fetched
  alongside the existing patient-report-group and scheduled-reports
  queries inside the page's own `loadReportData()` (same
  `client.query({fetchPolicy: 'network-only'})` imperative pattern this
  page already uses, not `useQuery`). New "Claim Analytics" section:
  four summary cards (total claims, approval rate, recovery rate, total
  approved), a denial-reason chip list, and a payer-scorecard table —
  all following the page's own existing card/table styling exactly (no
  new visual pattern introduced).
- `manager/reports/index.test.jsx` — **new file; none existed for this
  page before this slice.** 5 tests covering real summary figures,
  the honest empty state, the denial-category chips, one scorecard row
  per payer, and the `avgDecisionDays` em-dash state.

## Verification

Backend: 117/117 unit suites, 1896/1896 tests (11 new in
`analytics.service.spec.ts`'s new `getClaimAnalytics` block); `tsc
--noEmit`/`eslint` clean; integration 9/9 suites, 414/414 tests — no
new tenancy-matrix domain needed (the `analytics` domain is already
classified from the two pre-existing queries). Frontend: 5/5 new tests
in `manager/reports/index.test.jsx`; lint ratchet raised 4842→4851
(pre-existing I18N-1 class only); build + `size-limit` green
(essentially flat — `manager/reports` is its own lazy chunk).
