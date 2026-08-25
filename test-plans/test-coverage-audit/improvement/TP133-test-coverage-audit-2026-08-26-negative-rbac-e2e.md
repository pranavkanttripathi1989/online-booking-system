---
id: TP133
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN106
related: [REQ075]
---

# TP133 — Test plan for negative-RBAC e2e coverage (F-27)

## `frontend/e2e/rbac-negative.spec.js`

| # | Case | Expected |
|---|---|---|
| 1 | Patient session → `/admin/users` | `Forbidden403` rendered, not the user directory |
| 2 | Patient session → `/admin/roles` | `Forbidden403` rendered, not the role list |
| 3 | Manager reading a real patient in a different org | `patient(id)` returns `null` |

## Run

```
cd frontend && npx playwright test e2e/rbac-negative.spec.js
```

Requires the real dev stack up (`medibook_backend`/`medibook_postgres`/
`medibook_frontend`).
