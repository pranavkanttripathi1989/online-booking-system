---
id: TP255
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN235
related: [BUG060, PLAN235, TR255]
---

# TP255 — test plan for BUG060 fixes

1. **`admin/users/form.test.jsx`**
   - `CreateUserPage` with no role selected sends `role_ids: []`, not
     an omitted/`undefined` key — `MockedProvider`'s strict variable
     matching proves the mutation is actually reachable.
   - `EditUserPage` with a real `getUser` result renders the real
     fetched name/email, never `MOCK_USER_STORE`'s fabricated names.
   - `EditUserPage` with `getUser: null` (a real, successful "no such
     user" result) shows "User not found", never mock data.
2. **`admin/Departments.test.jsx`**
   - A staff-only caller sees the departments list but not "Add
     Department" or any row's Edit/Delete icon.
   - A manager caller sees all three write controls.
3. **Regression**: full `frontend/src/pages/admin` Jest suite (5
   suites) must stay green; `npm run build` must succeed.
