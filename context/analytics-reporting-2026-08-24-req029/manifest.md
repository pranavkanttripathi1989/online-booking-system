---
id: CTX-analytics-reporting-2026-08-24-req029
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ029
related: [PLAN061, TP088, TR087]
---

# analytics-reporting — REQ029 slice: true utilisation + tenancy-matrix coverage (2026-08-24)

Second of five PRD-derived requirement slices picked and built in one pass
(REQ014 → **REQ029** → REQ025 → REQ016 → REQ023).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ029 | [report groups, scheduled delivery, and true utilisation metrics](../../requirements/analytics-reporting/requirement/REQ029-analytics-reporting-2026-08-22-report-groups-and-scheduled-delivery.md) |
| implementation-plans | PLAN061 | [true utilisation + tenancy-matrix coverage](../../implementation-plans/analytics-reporting/requirement/PLAN061-analytics-reporting-2026-08-24-true-utilisation.md) |
| test-plans | TP088 | [verification plan](../../test-plans/analytics-reporting/requirement/TP088-analytics-reporting-2026-08-24-true-utilisation.md) |
| test-results | TR087 | [verification results — pass](../../test-results/analytics-reporting/requirement/TR087-analytics-reporting-2026-08-24-true-utilisation.md) |

## What shipped

- `AnalyticsService.computeTrueUtilisation()` — real slot-capacity
  utilisation (booked minutes ÷ available minutes, from
  `ClinicianAvailability` minus `SpacerBlocks`/`LunchBreaks`), replacing
  the completion-rate proxy `AppointmentStats.utilization` used to return.
  Ports `availability.service.ts`'s existing `availableSlots()` interval-
  subtraction algorithm rather than reinventing it. Falls back to the old
  proxy only when there's zero availability data in scope.
- Removed the now-stale documented caveat comment in
  `analytics.entity.ts`, per the requirement's own acceptance criterion.
- New tenancy-matrix domain-case for `getAppointmentStats` (only
  `getClinics` had coverage before).
- Tests: 6 new hand-computed-fixture unit tests for the utilisation calc,
  1 new org-scoping test, +9 integration tests from the new domain-case.

## Real findings from this slice

1. **A genuine test-setup bug**, not a product bug: the two new dedicated
   *completed* fixture appointments added for this slice's own tenancy-
   matrix coverage originally reused the same clinician + time slot as the
   pre-existing `appointmentA`/`appointmentB` fixture rows, violating the
   real Postgres no-overlap EXCLUDE constraint
   (`appointments_no_overlapping_booking`) — `npm run test:int`'s global
   setup failed outright before any test could even run. Fixed by giving
   the new rows a distinct time slot on the same day.
2. **Live confirmation, not just unit tests**: a live `getAppointmentStats`
   call against real seeded data returned a non-round utilisation fraction
   (`1.515...%`), which a completion-rate proxy could never produce —
   confirming the real calculation is genuinely running, not the old
   proxy silently still in place.

## What's deliberately not built yet

`US-RPT-02` (patient reporting) and `US-RPT-03` (scheduled delivery) — both
P1 in `REQ029`'s own phase assignment, untouched. `US-RPT-02`/`03`'s
underlying clinical/pharmacy/insurance report groups also remain blocked
on `REQ020`/`022`/`031` as `REQ029`'s own requirement doc already noted. No
live browser pass against `manager/Dashboard.jsx`'s KPI card was performed
this session — logged as open.

## Next in this pass

REQ025 (WhatsApp dispatch fallback + quiet hours/frequency cap).
