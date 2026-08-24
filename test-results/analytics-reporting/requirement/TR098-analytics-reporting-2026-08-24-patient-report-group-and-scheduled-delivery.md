---
id: TR098
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP099
related: [REQ029, PLAN072]
---

# TR098 — Results: patient report group + scheduled delivery

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `scopes the in-range patient lookup to the caller org` |
| TC-02 | pass | `classifies a patient with a prior visit before the range as repeat, one with none as new` |
| TC-03 | pass | `buckets acquisition source, defaulting a missing value to "unknown"` |
| TC-04 | pass | `surfaces a lapsed patient with their most recent visit date` |
| TC-05 | pass | `rejects deactivating a cross-org schedule` |
| TC-06 | pass | `delivers (and updates last_sent_at) a schedule that has never been sent` |
| TC-07 | pass | `skips a daily schedule already sent within the last 24 hours` |
| TC-08 | pass | `delivers a daily schedule last sent over 24 hours ago` |
| TC-09 | pass | `routes patient_report_group report_type to getPatientReportGroup, not getAppointmentStats` |
| TC-10 | pass | `does not let one report failing to compute stop the others from being attempted` |
| TC-11 | pass | New `scheduled-reports`/`scheduledReports` domain-case — matrix + tenancy suites both green |
| TC-12 | pass | `npx tsc --noEmit` — clean |
| TC-13 | pass | `npx eslint` — 0 errors |
| TC-14 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-15 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## A real schema bug found by `tsc`, before it ever ran

The first draft of the `ScheduledReports` Prisma model omitted
`clinic_id` entirely, even though the DTO/entity/service all reference it
(a schedule optionally scoped to one clinic, not always the whole org).
`tsc --noEmit` caught the mismatch immediately (`clinic_id does not exist
in type ScheduledReportsUncheckedCreateInput`) before any test ran against
it. Fixed with a small follow-up migration
(`20260825020000_scheduled_reports_clinic_id`) adding the column, its FK
to `Clinics`, and an index — applied cleanly on top of the same-session
`20260825010000` migration with no data loss (the table had zero rows at
that point in the session).

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note). Live-tested `createScheduledReport` with a
real `clinic_id` as `manager@medibook.dev` against "MG Road Clinic" —
succeeded, returned the created row with `clinic_id` populated correctly.

**A real bug found and fixed live** (the same bug class as `pharmacy`'s
`AdjustStockInput`, see `TR094`, and `plans`' `price` fields, see
`TR092`): `ScheduledReportInput.clinic_id` had zero `class-validator`
decorators. Before the fix, this exact live call would have failed with
`"property clinic_id should not exist"` (global `ValidationPipe`
`whitelist:true` stripping an undecorated field) — caught proactively by
auditing every new DTO in this session's pass after the first instance of
this bug class surfaced live in `pharmacy`. Fixed by adding
`@IsOptional()`. Full suite re-confirmed green after the fix.

`deliverDueReports`'s hourly `@Cron` trigger itself was still not
observed firing live in this pass (would require waiting for a real
top-of-hour tick against the running container) — the service method's
logic is covered at the unit level (`TC-06`–`TC-10`) and the mutation it
depends on (`createScheduledReport`) is now confirmed live.
