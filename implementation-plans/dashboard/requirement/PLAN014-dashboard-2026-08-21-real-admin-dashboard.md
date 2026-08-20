---
id: PLAN014
type: requirement
feature: dashboard
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ007
related: [TP044, TR043]
---

# Implementation plan — real `dashboard` query (REQ007)

## New backend module: `backend/src/dashboard/`

No Prisma schema changes — this is pure aggregation over existing models (`Appointments`, `Clinicians`, `Patients`, `AppointmentPayments`, `ClinicianAvailability`). Follows the standard domain-module layout (`dashboard.module.ts`, `.resolver.ts`, `.service.ts`, `entities/dashboard.entity.ts`), registered in `app.module.ts` alongside `AnalyticsModule`.

Deliberately a *separate* module from `analytics/` even though both aggregate appointment data: `analytics.resolver.ts`'s two queries (`getClinics`/`getAppointmentStats`) are explicitly the camelCase "public"-style dialect backing `manager/Dashboard.jsx`; this `dashboard` query is the canonical snake_case dialect backing a different page (`/dashboard`, admin/staff). Mixing both dialects in one resolver file would be confusing — matches the codebase's existing two-dialects-kept-separate precedent (CLAUDE.md Architecture section).

### `entities/dashboard.entity.ts`

`DashboardType` plus four small nested `@ObjectType()`s matching `DASHBOARD_QUERY` field-for-field:
- `DashboardUpcomingAppointmentType` (own minimal `patient`/`clinician`/`service` ref types — `{id, full_name}` / `{id, full_name, avatar_url, clinician_type{name}}` / `{id, name}` — not a reuse of the full canonical `PatientType`/`ClinicianType`, which would over-fetch fields this lightweight query has no use for; other slim views in this codebase already do the same).
- `DashboardClinicianUtilisationType`
- `DashboardVolumeByDayType`
- `DashboardBookingsByServiceType`

### `dashboard.service.ts` — one method, `getDashboard(user: JwtPayload)`

Org-scoping mirrors `analytics.service.ts`'s `orgScope()` (`clinic.client_org_id`) for `Appointments`, and `patients.service.ts`'s `orgScope()` (via-appointments OR no-appointments-yet) for `Patients`. `AppointmentPayments` has its own nullable `client_org_id` column — filtered directly, same as `appointment-payments.service.ts`.

Field-by-field:

| Field | Definition |
|---|---|
| `total_appointments_today` / `_change` | Count where `appointment_time` is today (UTC calendar day); change = % vs. yesterday's count. |
| `total_appointments_week` | Count over the last 7 days including today (not a calendar-week boundary — simpler, and the frontend doesn't currently render this field, just needs a real non-null value to satisfy the schema). |
| `total_appointments_month` | Count from the 1st of the current month to now. |
| `total_clinicians` / `_change` | Count of active, non-deleted, org-scoped `Clinicians`; change = % vs. count that already existed 30 days ago (`created_at <= now-30d`). |
| `total_patients` / `_change` | Same shape as `total_clinicians`, via `patients.service.ts`'s org-scope pattern. |
| `total_revenue_month` / `_change` | **Identical metric to `finances/index.jsx`'s KPI** (REQ004's `myFinanceSummary`) — sum of `succeeded` `AppointmentPayments.amount` this calendar month, paise→rupees at the boundary. Change = % vs. last calendar month's equivalent sum. Deliberately NOT `analytics.service.ts`'s different "billable value of completed appointments" revenue — the two pages must not silently disagree on what "revenue" means (flagged explicitly in REQ007). |
| `no_show_rate` | Over the last 30 days: `count(status='no_show') / count(status in ['completed','no_show'])`, i.e. rate among appointments that were actually due to happen. 0 when the denominator is 0. |
| `upcoming_appointments` | Next 5 appointments with `appointment_time >= now` and status not `cancelled`, ordered ascending. Reuses the exact `start_datetime`/`end_datetime` combination logic already in `appointments.service.ts`'s `toGraphQL` (`appointment_time` + `duration_minutes`). |
| `utilisation_by_clinician` | Last 7 days. `slots_booked` = that clinician's non-cancelled appointment count in the window. `slots_available` = sum, over the clinician's active `ClinicianAvailability` rows, of `(end_time - start_time in minutes) / 30` for each matching day in the window — `daily` recurrence matches all 7 days, `weekly` matches only its `day_of_week`, `monthly`/`custom` are skipped (not counted) — same simplification `analytics.entity.ts` already documents and justifies for its own utilisation proxy; lunch breaks/blocks are not subtracted (documented, not silently dropped). A clinician with zero matching availability rows gets `slots_available = max(slots_booked, 1)` as a divide-by-zero guard, not a fabricated number. `utilisation_percent` capped at 100. |
| `volume_by_day` | Last 30 days, `confirmed_count`/`cancelled_count` per ISO date, org-scoped. |
| `bookings_by_service` | Last 30 days, grouped by `product.name`, org-scoped. |

### `dashboard.resolver.ts`

`@Auth('admin', 'super_admin', 'staff')` — matches `App.jsx`'s `RoleGuard roles={['admin', 'super_admin', 'staff']}` on the `/dashboard` route exactly (hard rule 7). Single `dashboard` query, no arguments (matches `DASHBOARD_QUERY`'s shape).

## Testing

`dashboard.service.spec.ts`: happy path (each field computed correctly against seeded fixtures), tenant isolation (org A's `dashboard` never includes org B's counts/rows — explicit rejection test per hard rule 6), role gating via the `@Auth` decorator (existing guard test pattern, no new guard logic needed since this reuses the global `RolesGuard`).

`frontend/e2e/dashboard.spec.js`: login as a seeded admin/staff account, load `/dashboard`, assert zero console errors and that the KPI cards show non-mock values (the four mock numbers — `24`/`12`/`1,483`/`$28,750` — are distinctive enough to assert *against*, i.e. the test fails if the page is still silently on mock).

## Verification

`npm test` (backend) green, `npm run e2e -- dashboard` (frontend) green, responsive spot-check at 360/768/1280px (page layout itself is unchanged, only the data source), commit.
