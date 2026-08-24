---
id: PLAN072
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ029
related: [PLAN061]
---

# PLAN072 — Implementation plan: patient report group + scheduled delivery

## Scope

`US-RPT-02` (new-vs-repeat breakdown, acquisition-source attribution, a
lapsed-patient recall list) and `US-RPT-03` (scheduled report delivery).
Both P1 in the requirement doc — picked in this pass because they're
additive extensions of a domain this session already touched
(`PLAN061`'s true-utilisation fix), and `US-RPT-03` specifically reuses
already-real infrastructure (`@nestjs/schedule`, already imported by
`appointment-payments-reconciliation.service.ts`) rather than needing new
plumbing.

## Design

`getPatientReportGroup(clinicId, startDate, endDate, lapsedLookbackDays,
user)` — new `AnalyticsService` method. `Patients` has no `client_org_id`
of its own (a pre-existing schema quirk, confirmed by reading
`patients.service.ts`'s own comment before designing); scoped indirectly
via `appointments: { some: { clinic: { client_org_id } } }`, the same
shape that service already uses. New vs. repeat is determined by checking
whether each in-range patient has any *prior* (before the range start)
non-range appointment via `appointments.groupBy`, not a second full fetch.
Lapsed patients: any patient with at least one appointment ever, but none
since the configurable cutoff, with their single most recent visit
attached via a `take: 1` nested include.

`ScheduledReports` (client_org_id, clinic_id?, report_type, recipients_json,
cadence, channel) + `ScheduledReportsService.deliverDueReports()`, a single
`@Cron('0 * * * *')` (hourly) job that checks *each* schedule's own
cadence against its own `last_sent_at` — not three separate cron
expressions for daily/weekly/monthly — computing the snapshot via the real
`AnalyticsService` methods (`getAppointmentStats` or
`getPatientReportGroup`, routed by `report_type`) and updating
`last_sent_at` only after a successful attempt; one schedule's compute
failure doesn't stop the others in the same run (a per-report try/catch,
not a batch-level one). `AnalyticsModule` now exports `AnalyticsService`
for this reuse.

**Sends are stubbed**, matching this dev environment's own existing
convention: `auth.service.ts`'s OTP path already logs `[OTP STUB] Would
send...` rather than calling a real AWS SES/SMS provider (none is
integrated anywhere in this codebase yet, confirmed by grep before
assuming otherwise). `deliverOne()` logs `[REPORT DELIVERY STUB] Would
send...` with the real computed snapshot, the same honest non-claim. Only
`email` is a supported channel this slice (`REPORT_CHANNELS = ['email']`)
— WhatsApp is deferred, since it needs the same per-org
provider-config lookup `REQ025`'s dispatch logic already has, which this
slice's simpler CRUD doesn't replicate.

## Files touched

- `backend/prisma/schema.prisma` — `Patients.acquisition_source`; new
  `ScheduledReports` model (a follow-up migration added `clinic_id`,
  missed in the first draft and caught by `tsc` before it shipped — see
  `TR098`).
- `backend/src/analytics/{analytics.service.ts,analytics.resolver.ts,entities/analytics.entity.ts,analytics.module.ts}` —
  `getPatientReportGroup`, new `PatientReportGroupType`/
  `AcquisitionSourcePointType`/`LapsedPatientPointType`; `AnalyticsService`
  now exported.
- `backend/src/scheduled-reports/` (new module) — `module/resolver/service`,
  `dto/scheduled-report.input.ts`, `entities/scheduled-report.entity.ts`.
- No frontend UI in this slice — both new queries/mutations are real and
  tested; a Patient report group dashboard tab and a "Schedule this
  report" admin control are deliberately deferred, logged as open.

## GraphQL contract

`getPatientReportGroup(clinicId, startDate, endDate, lapsedLookbackDays)` —
`manager, admin, super_admin`, matching `getAppointmentStats`'s own
camelCase dialect (this is the same dashboard-aggregation surface, not the
canonical snake_case one). `scheduledReports`, `createScheduledReport`,
`deactivateScheduledReport` — `manager, admin, super_admin`.

## Test plan

See `TP099`.

## Test results

See `TR098`.
