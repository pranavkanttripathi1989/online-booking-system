---
id: TP229
type: bug
feature: patient-portal
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN209
related: [BUG045]
---

# TP229 — Test plan for PLAN209

| # | Case | Expected |
|---|---|---|
| 1 | `/patient/dashboard` as `patient@medibook.dev` | No "Could not load live dashboard data" banner |
| 2 | Same page | No fabricated "Dr. Sarah Johnson"/"Dr. Marcus Osei" entries |
| 3 | Same page (unlinked demo account, `patient_id: null`) | Honest self-scoped empty state: 0/0/0/0 KPIs, "You have no upcoming appointments", "No recent doctors found" |
| 4 | Network tab, every request on this page | 200, no `GRAPHQL_VALIDATION_FAILED` errors |
| 5 | `npx eslint` | Clean |
