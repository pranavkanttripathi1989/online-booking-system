---
id: PLAN061
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ029
related: [PLAN060]
---

# PLAN061 — Implementation plan: true utilisation + tenancy-matrix coverage

## Scope

`US-RPT-01` (true slot-capacity utilisation, replacing the documented
completion-rate proxy) and `US-RPT-04` (role-scoped access re-verification,
concretely: add `getAppointmentStats` to the tenancy matrix, which only had
`getClinics` covered before this slice). `US-RPT-02` (patient reporting)
and `US-RPT-03` (scheduled delivery) are P1, untouched.

## Design

`AnalyticsService.summarize()`'s `utilization` field used to be
`completed / total * 100` — a documented, deliberate proxy (see the removed
comment in `entities/analytics.entity.ts`). Replaced with
`computeTrueUtilisation()`: booked minutes ÷ available minutes, where
available minutes comes from walking each in-scope clinician's
`ClinicianAvailability` windows (`mode: 'slot'` only) minus `LunchBreaks`/
`SpacerBlocks`, for every day in the queried range. Ports
`availability.service.ts`'s `availableSlots()` interval-subtraction
algorithm (same day-of-week/`recurrence_type: 'daily'` window matching,
same one-off `block_date` matching for spacer blocks — not full recurrence
expansion, matching that method's own existing simplification) rather than
reinventing it.

Booked minutes = sum of `Appointments.duration_minutes` (the appointment's
own real duration, not the linked product's nominal one) for every
appointment whose status isn't `cancelled`/`no_show` — i.e., anything that
actually occupied calendar time, matching the acceptance criterion's own
"4 booked hours out of 8 available" framing.

Falls back to the old completion-rate proxy only when `availableMinutes`
is `0` (no availability data in scope at all) — not a real "0% utilised"
answer, which would misrepresent an org with no `ClinicianAvailability`
rows configured yet as fully idle.

Deliberately NOT touched: `dashboard.service.ts`'s own
`getUtilisationByClinician()` — a separate, coarser proxy in a different
domain (`dashboard.utilisation_by_clinician`, not `analytics.
AppointmentStats.utilization`) that this requirement's target field isn't.

## Files touched

- `backend/src/analytics/analytics.service.ts` — `summarize()` now also
  returns `bookedMinutes` and a renamed `completionRateProxy` (was
  `utilization`); new `computeTrueUtilisation()` private method;
  `getAppointmentStats()` computes the real value for both the current and
  comparison period, falling back to the proxy per-period independently.
- `backend/src/analytics/entities/analytics.entity.ts` — removed the
  documented completion-rate-proxy caveat comment, replaced with a comment
  describing the real calculation (US-RPT-01's own acceptance criterion:
  don't leave the caveat sitting next to a now-real fix).
- `backend/src/analytics/analytics.service.spec.ts` — `prisma` mock gains
  `clinicians: { findMany }` (defaulted to `[]`, preserving every
  pre-existing test's proxy-based expectations unchanged); new
  `getAppointmentStats — true utilisation` describe block, hand-computed
  fixtures for: base case, lunch-break subtraction, spacer-block
  subtraction, the >100% clamp, the no-availability-data fallback, and org
  scoping on the new `clinicians.findMany` call.
- `backend/test/integration/setup/fixture.ts` — two new dedicated
  *completed* appointments (`analyticsApptA`/`B`) rather than mutating the
  existing `appointmentA`/`B` (which default to `scheduled` and are relied
  on as such by other domain-cases, e.g. `dashboard.upcoming_appointments`
  — confirmed by grep before deciding not to touch them).
- `backend/test/integration/setup/domain-cases.ts` — new `analytics`
  domain-case entry for `getAppointmentStats.topClinicians` (the
  comparable id list, since `AppointmentStats` is one aggregate object per
  call, not a bare id-bearing list — mirrors the existing `dashboard`
  domain-case's own nested-array-field pattern).

## GraphQL contract — unchanged

`AppointmentStats.utilization: Float!` and `AppointmentStatsTrends.
utilization: Float!` keep their exact field names, types, and 0–100
percentage scale. `manager/Dashboard.jsx`'s "Clinician Utilization" KPI
card needs zero frontend changes.

## Test plan

See `TP088`.

## Test results

Deferred to the end-of-pass consolidated verification run across all five
slices (see `context/analytics-reporting-2026-08-24-req029/manifest.md`
once written) — see `TR087` once that run completes.
