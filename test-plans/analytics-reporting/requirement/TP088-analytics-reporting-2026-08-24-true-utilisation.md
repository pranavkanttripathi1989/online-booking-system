---
id: TP088
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ029
related: [PLAN061]
---

# TP088 — Test plan: true utilisation + tenancy-matrix coverage

Direct test-plan against an already-proven algorithm (ports
`availableSlots()`'s own interval-subtraction) — suggestion stage skipped
per `CLAUDE.md`'s working loop step 4.

## Unit — `analytics.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | One clinician, 8h daily window, no busy time, 2×60min non-cancelled appointments + 1×60min cancelled | `getAppointmentStats` for that single day | `utilization = 25` (120÷480×100); cancelled excluded from booked minutes |
| TC-02 | Same window, a 60min daily lunch break | `getAppointmentStats`, 1×60min booked | `utilization ≈ 14.29` (60÷420×100) |
| TC-03 | Same window, a 30min same-day spacer block | `getAppointmentStats`, 1×60min booked | `utilization ≈ 13.33` (60÷450×100) |
| TC-04 | A 1h window, a 120min booked appointment (manual overbooking) | `getAppointmentStats` | `utilization` clamped to `100`, not `200` |
| TC-05 | No clinicians/availability data in scope at all | `getAppointmentStats`, 1 of 2 appointments completed | Falls back to the completion-rate proxy (`50`), not `0` or a crash |
| TC-06 | `clinicId` param provided | `getAppointmentStats` | The new `clinicians.findMany` call is scoped by both `clinic_id` and the caller's org, same as the existing `appointments.findMany` scoping |
| TC-07–TC-14 | All pre-existing `getAppointmentStats`/`getClinics` cases | Re-run after the `clinicians` mock addition | Pass unchanged (defaulted to `[]`, so every pre-existing case still exercises the completion-rate-proxy fallback path exactly as before) |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-15 | New `analytics`/`getAppointmentStats.topClinicians` domain-case, two dedicated *completed* fixture appointments (`analyticsApptA`/`B`, added rather than mutating the shared `appointmentA`/`B` other domain-cases depend on) | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; org-A caller's `topClinicians` includes `clinicianA`, never `clinicianB`; role gating enforced (`super_admin`/`admin`/`manager` only) |
| TC-16 | Pre-existing `dashboard.upcoming_appointments` domain-case (relies on `appointmentA`/`B` staying `scheduled`) | Full `test:int` run | Still passes — confirms the new dedicated fixture rows didn't disturb it |

## Live verification against the real dev stack

| Case | Given | When | Then |
|---|---|---|---|
| TC-17 | Real seeded data with known `ClinicianAvailability`/`Blocks`/appointment rows | `manager/Dashboard.jsx`'s "Clinician Utilization" KPI card | Renders a materially different (correct, real) number, not just *a* number — confirms the fix reached the live UI, not just the unit tests |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-18 | `npx tsc --noEmit` | No new errors |
| TC-19 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | 0 errors, 0 new warnings |
| TC-20 | `npm test` (full suite) | All suites green |
| TC-21 | `npm run test:int` | All suites green |
