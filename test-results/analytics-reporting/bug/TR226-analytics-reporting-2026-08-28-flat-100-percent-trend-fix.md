---
id: TR226
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP226
related: [BUG035, BUG042, PLAN206]
---

# TR226 — Results for PLAN206

Executed 2026-08-28/29 against the real dev stack via Chrome DevTools
MCP, plus the backend and frontend unit suites.

| # | Case | Result |
|---|---|---|
| 1–3 | Backend `null`-on-no-baseline tests | Pass (41/41 `analytics`+`dashboard` suites) |
| 4–7 | `StitchKpiCard` tests | Pass (4/4) |
| 8 | `/manager/dashboard` | Pass — all five KPI cards show no trend badge |
| 9 | `/staff/dashboard` | Pass — "Today's Appointments"/"Total Patients" show no sub-label |
| 10 | `tsc`/`eslint` | Pass — clean |

10/10 pass. `BUG035`, `BUG042` both marked `done`.
