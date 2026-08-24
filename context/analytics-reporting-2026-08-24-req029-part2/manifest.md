---
id: CTX-analytics-reporting-2026-08-24-req029-part2
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ029
related: [PLAN061, PLAN072, TP099, TR098]
---

# analytics-reporting — REQ029 slice 2: patient report group + scheduled delivery (2026-08-24)

Eighth and final requirement slice in this pass (REQ018 → REQ032 → REQ034
→ REQ022 → REQ030 → REQ031 → REQ015 → **REQ029**).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN072 | [patient report group + scheduled delivery](../../implementation-plans/analytics-reporting/requirement/PLAN072-analytics-reporting-2026-08-24-patient-report-group-and-scheduled-delivery.md) |
| test-plans | TP099 | [verification plan](../../test-plans/analytics-reporting/requirement/TP099-analytics-reporting-2026-08-24-patient-report-group-and-scheduled-delivery.md) |
| test-results | TR098 | [verification results — pass](../../test-results/analytics-reporting/requirement/TR098-analytics-reporting-2026-08-24-patient-report-group-and-scheduled-delivery.md) |

## What shipped

`getPatientReportGroup` (new-vs-repeat breakdown, acquisition-source
attribution, a configurable lapsed-patient recall list) and
`ScheduledReports` — an hourly `@Cron` job checking each schedule's own
cadence against `last_sent_at`, computing the real snapshot via
`AnalyticsService` (now exported for reuse). Sends are stubbed
(`console.log`) the same way OTP SMS already is in this dev environment —
no real AWS SES integration exists anywhere in this codebase yet; only the
transport is a stand-in, the report-computation and cadence-tracking are
real.

## A real schema bug caught by `tsc`, before it ever ran

The first draft of `ScheduledReports` omitted `clinic_id` even though the
DTO/entity/service all reference it. Caught immediately by
`tsc --noEmit`, fixed with a small follow-up migration
(`20260825020000_scheduled_reports_clinic_id`) applied cleanly on top of
this session's own combined `20260825010000` migration.

## What's deliberately scoped down

Email-only delivery this slice (WhatsApp deferred — needs the same
per-org provider-config lookup `REQ025`'s dispatch logic already has).
Clinical/Pharmacy report groups remain blocked on their source modules.

## This closes the eight-slice pass

REQ018 → REQ032 → REQ034 → REQ022 → REQ030 → REQ031 → REQ015 → REQ029, all
eight shipped and verified (unit + integration; live GraphQL/browser
verification deferred to next session — see `TR092`'s environment note on
why). See `machine-handoff` context and CLAUDE.md for the consolidated
account.
