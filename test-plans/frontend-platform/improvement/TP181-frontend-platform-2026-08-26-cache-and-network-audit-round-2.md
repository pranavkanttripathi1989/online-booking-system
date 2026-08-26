---
id: TP181
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN161
related: []
---

# TP181 — Test plan: cache-and-network audit round 2

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | `staff/index.jsx` | Read `GET_STAFF`'s `useQuery` options | `fetchPolicy: 'cache-and-network'` present |
| 2 | `reviews/index.jsx` | Read `GET_REVIEWS`'s `useQuery` options | `fetchPolicy: 'cache-and-network'` present |
| 3 | `admin/users/index.jsx` | Read `GET_ADMIN_DATA`/`GET_AUDIT_LOGS`'s options | Both have `fetchPolicy: 'cache-and-network'`; `GET_RBAC_DATA` deliberately untouched |
| 4 | `clinician/Calendar.jsx` | Read `GET_WEEK_APPOINTMENTS`/`GET_LUNCH_BREAKS`'s options | Both have `fetchPolicy: 'cache-and-network'` |
| 5 | `manager/Dashboard.jsx` | Read `GET_MANAGER_DASHBOARD_DATA`/`GET_MANAGER_TRANSACTIONS`'s options | Both have `fetchPolicy: 'cache-and-network'` |
| 6 | Lint clean | `eslint` on all 5 files | 0 errors; only pre-existing warnings, none new |
| 7 | No GraphQL contract change | Diff review | No query/mutation shape changed, only `fetchPolicy` added |
