---
id: TP230
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN210
related: [BUG032]
---

# TP230 — Test plan for PLAN210

| # | Case | Expected |
|---|---|---|
| 1 | Admin console quick-nav on any `/admin/*` page | "Rights Requests", "Plans", "Insurance Payers", "Departments" all present and navigate correctly |
| 2 | `/admin/users`, click "Audit Logs" tab | URL becomes `?tab=2`; "Audit Log" quick-nav item highlights |
| 3 | Click back to "Users Directory" | URL clears the query string; "Audit Log" de-highlights |
| 4 | `npx eslint` on both touched files | Clean |
