---
id: REQ156
type: improvement
feature: analytics-reporting
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ029
related: [PLAN197, TP217, TR217]
---

# REQ156 — Denial analytics + payer scorecards (P2-04)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-04 slice,
depending on `P2-03` (`REQ155`), which shipped the real denial
categories (`ClaimAppeals.denial_category`) and decision timestamps this
report reads. Its own tracker note — *"`Claims` data model already
there"* — undersold what actually needed reading: `ClaimAppeals` did
not exist before `P2-03`, so a real denial breakdown was only possible
starting this session.

## User story

As a manager, I want to see which payers approve fastest and most
often, and why claims get rejected in aggregate, so I can prioritise
which payer relationships to escalate and which documentation gaps to
fix at the front desk.

## Acceptance criteria

- **Given** the manager reports page, **when** a date range and
  optional clinic are selected, **then** real claim counts by status
  (submitted/under_review/approved/rejected/settled), an approval rate
  over decided claims, and a recovery rate (approved ÷ claimed amount)
  are shown.
- **Given** claims rejected in range with a real drafted appeal
  (`P2-03`), **then** a denial-category breakdown is shown with real
  counts — never a fabricated or guessed category.
- **Given** a rejected claim with no appeal row (pre-`P2-03` data),
  **then** it is excluded from the breakdown rather than silently
  mis-bucketed into a category it was never actually classified into.
- **Given** claims from more than one payer in range, **then** one
  scorecard row per payer shows: total claims, approved/rejected/
  pending counts, approval rate, average decision time in days, and a
  recovery rate.
- **Given** a payer with no decided claims yet in range, **then** its
  average decision time is shown as an honest "not enough data" state
  (`—`), never a fabricated zero.
- **Given** the same org-scoping every other analytics query already
  uses, **then** a manager only ever sees their own org's claims —
  reused, not re-derived.

## In scope

- `AnalyticsService#getClaimAnalytics` (new), `getClaimAnalytics`
  GraphQL query on `AnalyticsResolver` — same `manager, admin,
  super_admin` gate and `clinicId`/`startDate`/`endDate` shape as
  `getAppointmentStats`/`getPatientReportGroup`.
- `ClaimAnalyticsType`/`DenialCategoryPointType`/`PayerScorecardType` —
  new GraphQL entities, matching this module's existing style.
- A new "Claim Analytics" section on `manager/reports/index.jsx`:
  summary cards, a denial-reason chip list, and a payer scorecard
  table — reusing the page's existing clinic/date-range filter and its
  established `client.query()` imperative-fetch pattern.
- A first test file for this page (`index.test.jsx` did not exist
  before this slice) covering the new section.

## Deliberately out of scope

- Any change to the underlying `Claims`/`ClaimAppeals` write paths —
  this is a read-only report over data `P2-03` already produces.
- A payer-scorecard PDF/export — no story names one; the existing
  scheduled-report delivery mechanism (`daily_collections`/
  `patient_report_group`/`utilisation`) is a separate, already-built
  system this slice does not extend to a new report type.
- Trend/comparison-period figures (the "vs. previous period" pattern
  `getAppointmentStats` already has) — not named in the phase doc's own
  scope, and claims volume is generally too low per-org for a
  period-over-period comparison to be meaningful yet.
