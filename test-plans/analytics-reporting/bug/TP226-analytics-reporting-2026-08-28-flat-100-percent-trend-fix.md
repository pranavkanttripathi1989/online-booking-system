---
id: TP226
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN206
related: [BUG035, BUG042]
---

# TP226 — Test plan for PLAN206

| # | Case | Expected |
|---|---|---|
| 1 | `analytics.service.ts#getAppointmentStats`, no previous-period data | `trends.totalAppointments` is `null`, not `100` |
| 2 | Same, both current and previous periods empty | `trends.totalAppointments` is `null`, not `0` |
| 3 | `dashboard.service.ts#getDashboard`, no prior-month revenue | `total_revenue_month_change` is `null`, not `100`/`0` |
| 4 | `StitchKpiCard` with `trend={null}` | No badge rendered |
| 5 | `StitchKpiCard` with `trend={undefined}` | No badge rendered |
| 6 | `StitchKpiCard` with a real trend | Rounded to 1 decimal |
| 7 | `StitchKpiCard` with `trend={0}` | Renders "0.0%" (a genuine unchanged value, distinct from null) |
| 8 | `/manager/dashboard` as `admin@medibook.dev` | No trend badges on any of the 5 KPI cards (real 30D-prior window has no data) |
| 9 | `/staff/dashboard` as `admin@medibook.dev` | "Today's Appointments"/"Total Patients" show no sub-label, not "+100%"/"100%" |
| 10 | `npx tsc --noEmit`, `npx eslint` | Clean |
