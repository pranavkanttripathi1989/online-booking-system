---
id: TP099
type: requirement
feature: analytics-reporting
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ029
related: [PLAN072]
---

# TP099 — Test plan: patient report group + scheduled delivery

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4.

## Unit — `analytics.service.spec.ts` (`getPatientReportGroup`)

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | A tenant caller | `getPatientReportGroup` | The in-range patient lookup is scoped via `appointments.some.clinic.client_org_id` |
| TC-02 | One patient with a prior visit before the range, one with none | | Classified repeat vs. new respectively |
| TC-03 | Patients with `referral`/`referral`/`null` acquisition sources | | Bucketed `{referral: 2, unknown: 1}` |
| TC-04 | A lapsed-candidate patient with one prior visit | | Surfaced with `full_name` and `last_visit` from their most recent appointment |

## Unit — `scheduled-reports.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-05 | A cross-org schedule | `deactivate` | Rejected, no write |
| TC-06 | A schedule with `last_sent_at: null` | `deliverDueReports` | Delivered; `last_sent_at` updated |
| TC-07 | A daily schedule sent 1 hour ago | `deliverDueReports` | Skipped — not yet due |
| TC-08 | A daily schedule sent 25 hours ago | `deliverDueReports` | Delivered |
| TC-09 | `report_type: 'patient_report_group'` | `deliverDueReports` | Routes to `getPatientReportGroup`, not `getAppointmentStats` |
| TC-10 | Two due schedules, the first's report computation throws | `deliverDueReports` | The second is still attempted and delivered — one failure doesn't stop the batch |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-11 | New `scheduled-reports` domain-case (`scheduledReports`), fixture schedules per org | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `manager`/`admin`/`super_admin`. (`getPatientReportGroup` itself needs no new domain-case — `analytics` is already a covered domain via `getAppointmentStats`/`getClinics`.) |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-12 | `npx tsc --noEmit` | Clean |
| TC-13 | `npx eslint` | 0 errors |
| TC-14 | `npm test` | All green |
| TC-15 | `npm run test:int` | All green |
