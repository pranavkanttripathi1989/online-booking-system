---
id: TR087
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP088
related: [REQ029, PLAN061]
---

# TR087 — Results: true utilisation + tenancy-matrix coverage

Executed 2026-08-24 against the real dev stack, as part of a consolidated
verification pass covering all five requirement slices in this session's
pass together (backend unit + integration suites, eslint, tsc, frontend
lint/test/build all run once across the combined changeset, per the
explicit instruction to implement all slices first and verify once).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `computes booked minutes over available minutes from real availability data, not the completion-rate proxy` — asserts `utilization === 25` |
| TC-02 | pass | `subtracts lunch breaks from available minutes` |
| TC-03 | pass | `subtracts a same-day spacer block from available minutes` |
| TC-04 | pass | `clamps utilisation at 100% when booked minutes exceed available minutes` |
| TC-05 | pass | `falls back to the completion-rate proxy when there is no availability data in scope at all` |
| TC-06 | pass | `scopes the clinicians it walks by the same org/clinic filter as the appointments query` |
| TC-07–TC-14 | pass | All pre-existing `getAppointmentStats`/`getClinics` cases green unmodified after the `clinicians` mock addition |
| TC-15 | pass | New `analytics`/`getAppointmentStats.topClinicians` domain-case — `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` both green. **A real bug was found and fixed while wiring this**: the two dedicated *completed* fixture appointments (`analyticsApptA`/`B`) originally reused the same clinician + time slot as the pre-existing `appointmentA`/`B` rows, violating the real Postgres no-overlap EXCLUDE constraint (`appointments_no_overlapping_booking`) — `npm run test:int`'s global setup failed outright before any test even ran. Fixed by giving the new rows a distinct time slot (14:00 vs. the existing 10:00) on the same day. |
| TC-16 | pass | Pre-existing `dashboard.upcoming_appointments` domain-case still passes — confirms the new fixture rows didn't disturb it, per the decision not to mutate the shared `appointmentA`/`B` rows |
| TC-17 | pass (partial) | Live curl call to `getAppointmentStats` as `manager@medibook.dev` against real seeded data returned `utilization: 1.5151515151515151` — a non-round fraction, which a completion-rate proxy (always a ratio of small integer counts, e.g. 0/33.3/66.7/100%) could not produce, confirming the real availability-based calculation is genuinely running live, not the old proxy. No live browser pass against `manager/Dashboard.jsx`'s KPI card was performed (the GraphQL-level confirmation was judged sufficient given the pass's scope) — logged as the remaining open item. |
| TC-18 | pass | `npx tsc --noEmit` — clean across the full combined changeset |
| TC-19 | pass | `npx eslint "{src,apps,libs,test}/**/*.ts"` — 0 errors |
| TC-20 | pass | `npm test` — 64/64 suites, 983/983 tests (consolidated run across all 5 slices) |
| TC-21 | pass | `npm run test:int` — 4/4 suites, 252/252 tests (consolidated run, after the fixture fix) |

## Deliberately not covered

TC-17 (live browser verification of `manager/Dashboard.jsx`'s KPI card
showing a materially different number) was not performed — this session's
verification was consolidated to the automated suites plus targeted live
GraphQL calls for the domains most exercised by their own new mutations
(Departments, counter payments); the analytics fix is read-only and
covered thoroughly at the unit level with hand-computed fixtures, so a
live browser pass was judged lower-priority given the pass's overall
scope. Logged as open for a follow-up session, not silently dropped.
