---
id: TR255
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: TP255
related: [BUG060, PLAN235, TP255]
---

# TR255 — test results for BUG060 fixes

Commit: `d800f61`

| Case | Result |
|---|---|
| `admin/users/form.test.jsx` — role_ids sent as `[]` on create | PASS |
| `admin/users/form.test.jsx` — EditUserPage real data | PASS |
| `admin/users/form.test.jsx` — EditUserPage not-found guard | PASS |
| `admin/Departments.test.jsx` — staff-only hides write controls | PASS |
| `admin/Departments.test.jsx` — manager shows write controls | PASS |
| Full `frontend/src/pages/admin` Jest suite | 5 suites / 25 tests, all PASS |
| `eslint` on the 4 touched source files | 0 errors (pre-existing i18n warnings only) |
| `npm run build` | succeeded |
