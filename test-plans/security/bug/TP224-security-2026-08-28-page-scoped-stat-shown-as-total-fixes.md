---
id: TP224
type: bug
feature: security
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN204
related: [BUG029, BUG036, BUG038]
---

# TP224 — Test plan for PLAN204

| # | Case | Expected |
|---|---|---|
| 1 | `getUsersStats` returns real total/active counts | Not the current page's row count |
| 2 | `getUsersStats` mirrors `getUsers()`'s org scope, role, and search filters | Same `where` shape, `active` = same filter + `is_active: true` |
| 3 | `getUsersStats` org-less non-platform caller | Scoped to `__no_org__` sentinel, matching `getUsers()` |
| 4 | `getAuditLogsCount` mirrors `getAuditLogs()`'s own filters | Same org-scope/action/resource behavior |
| 5 | `admin/users/index.jsx`: page through Users Directory as `admin@medibook.dev` | "Total Users"/"Active Users" stable across pages; "Showing X of Y" real; "Next" disables at the real last page |
| 6 | Same page, Audit Logs tab | Real "N of Total" pagination, "Next" enabled while more pages remain |
| 7 | `manager/clinics/index.jsx` as `admin@medibook.dev` | Header "N rooms total" and each clinic card's "Rooms" count match real `ROOMS_QUERY` data |
| 8 | `clinician/Patients.jsx` as `clinician@medibook.dev` | Stat card reads "With Upcoming (this page)", not "(page)" |
| 9 | `npx tsc --noEmit` (backend), `npx eslint` (all 4 touched frontend files) | Clean |
| 10 | Full backend unit suite for `src/users` | 64/64 pass |
