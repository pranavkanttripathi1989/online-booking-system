---
id: TP217
type: improvement
feature: analytics-reporting
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN197
related: [REQ156, TR217]
---

# TP217 — Test plan: denial analytics + payer scorecards (P2-04)

Well-scoped against an already-proven pattern (`getAppointmentStats`/
`getPatientReportGroup`'s own org-scope + in-process-aggregation shape).
Suggestion stage skipped per `CLAUDE.md`'s own conditional rule; drafted
directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1 | Scopes the claims lookup via the 2-level `appointment.clinic` org nesting | `analytics.service.spec.ts` |
| 2 | Filters by `clinicId` when supplied, in addition to org scope | same |
| 3 | Counts claims by status; approval rate computed over decided claims only | same |
| 4 | Converts claim/approved amounts paise→rupees; computes recovery rate | same |
| 5 | Returns `0` (not `NaN`) for approval/recovery rate with no claims | same |
| 6 | Builds the denial breakdown from each rejected claim's own drafted appeal | same |
| 7 | Excludes a rejected claim with no appeal row, rather than mis-bucketing it | same |
| 8 | Never counts an approved/settled/pending claim toward the denial breakdown | same |
| 9 | One scorecard per payer, sorted by total claims descending | same |
| 10 | `avgDecisionDays` computed only from claims that have actually been decided | same |
| 11 | `avgDecisionDays` left `undefined`, not `0`, when a payer has no decided claims yet | same |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | `matrix-coverage.int-spec.ts` confirms no new tenancy-matrix domain is needed — `getClaimAnalytics` lives in the already-classified `analytics` domain |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Renders real claim-analytics summary figures, not fabricated data | `manager/reports/index.test.jsx` |
| 2 | Shows an honest empty state when there are no claims in range | same |
| 3 | Renders the real denial-category breakdown as chips | same |
| 4 | Renders one real payer scorecard row per payer | same |
| 5 | Shows an em dash, not a fabricated zero, when a payer has no decided claims yet | same |

## Out of scope for this test plan

- A payer-scorecard PDF/export or scheduled-report integration — not
  named in this slice's own scope (see REQ156's own scope note).
- E2E/Playwright coverage — this is a read-only report addition to a
  manager page; `MockedProvider`-based unit coverage against the real
  query contract is the established pattern for this file's sibling
  (`manager/claims/index.test.jsx`).
