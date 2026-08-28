---
id: TP223
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN203
related: [BUG039, BUG046]
---

# TP223 — Test plan for PLAN203 (route-guard corrections)

Live browser verification only — no unit-test surface changed (see
`PLAN203`).

| # | Case | Expected |
|---|---|---|
| 1 | `receptionist@medibook.dev` (Staff) opens "Live Queue" from sidebar | Loads the real Live Queue page, no 403 |
| 2 | `patient@medibook.dev` navigates directly to `/appointments` | 403 "Access Forbidden" |
| 3 | `patient@medibook.dev` navigates directly to `/calendar` | 403 "Access Forbidden" |
| 4 | `receptionist@medibook.dev` opens "Appointments" from sidebar | Loads the real staff appointments list, no regression |
| 5 | `manager@medibook.dev`'s own access to routes in the shared manager block (dashboard, billing, availability, blocks, ...) | Unaffected — `/queue` was pulled out into its own guard, the shared block's role list was not changed |
| 6 | `npx eslint src/App.jsx` | Clean |
