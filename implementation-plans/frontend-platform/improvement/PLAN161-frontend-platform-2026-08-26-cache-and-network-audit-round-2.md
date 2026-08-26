---
id: PLAN161
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ121
related: [TP181, TR181]
---

# PLAN161 — Implementation plan: cache-and-network audit round 2

## Change

Added `fetchPolicy: 'cache-and-network'` to 7 query sites across 5
files, none of which had an explicit `fetchPolicy` before (all were
silently inheriting the global `cache-first` default):

- `frontend/src/pages/staff/index.jsx` — `GET_STAFF`.
- `frontend/src/pages/reviews/index.jsx` — `GET_REVIEWS`.
- `frontend/src/pages/admin/users/index.jsx` — `GET_ADMIN_DATA`,
  `GET_AUDIT_LOGS` (left `GET_RBAC_DATA` alone — a role's own
  configuration is a much lower-churn read than a user directory or
  audit log, kept the change bounded rather than blanket).
- `frontend/src/pages/clinician/Calendar.jsx` — `GET_WEEK_APPOINTMENTS`,
  `GET_LUNCH_BREAKS`.
- `frontend/src/pages/manager/Dashboard.jsx` — `GET_MANAGER_DASHBOARD_DATA`,
  `GET_MANAGER_TRANSACTIONS`.

No backend change — this is a frontend cache-policy configuration
change only, zero GraphQL contract impact.

## Testing

`eslint` on all 5 touched files: 0 errors (266 pre-existing warnings
across the 5 files, all `no-hardcoded-colors`/`no-unused-vars`/
`jsx-a11y` on lines untouched by this slice — none new). No dedicated
`.test.jsx` file exists for any of the 5 pages, so verification is
lint + manual read against each query's own established pattern
(matching `REQ078`'s own four already-correct pages exactly).

## Documentation

`REQ121` (this requirement), `PLAN161` (this plan), `TP181`/`TR181`
(verification), a context bundle, and index updates across all five doc
roots plus the `frontend-platform` feature README.
