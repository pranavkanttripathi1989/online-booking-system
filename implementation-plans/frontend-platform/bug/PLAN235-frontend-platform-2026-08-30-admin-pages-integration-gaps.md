---
id: PLAN235
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG060
related: [BUG060, TP255, TR255]
---

# PLAN235 — fix 7 admin/* integration gaps

## Scope

`frontend/src/App.jsx` (route regrouping), `frontend/src/pages/admin/
Departments.jsx`, `frontend/src/pages/admin/users/form.jsx`,
`frontend/src/pages/admin/users/index.jsx`. No backend change — every
gap was in how the frontend routed/gated/handled an already-correct
backend contract.

## Approach

1. **Route regrouping (`App.jsx`)**: moved `/admin/users*` out of the
   admin-only `RoleGuard` block into the existing "admin OR manager"
   block; added a new, narrowly-scoped `RoleGuard roles={['admin',
   'super_admin', 'manager', 'staff']}` block for `/admin/departments`
   alone (its own backend read-gate is the only admin-area domain that
   allows `staff`, so it doesn't fit either existing block).
2. **`Departments.jsx`**: added `useAuth().hasRole` and a `canManage`
   boolean (`manager`/`admin`/`super_admin`), gating the "Add
   Department" button and the per-row Edit/Delete icons — same pattern
   as `Payers.jsx`'s `canManagePayers`.
3. **`admin/users/form.jsx`**: three independent fixes in
   `UserFormPage`/`EditUserPage` (not-found guard gated on `error`;
   `role_ids` always sent as a real array; `createUser`'s `onError`
   simplified to always show the real failure).
4. **`admin/users/index.jsx`**: `GET_RBAC_DATA`'s `useQuery` now
   destructures `refetch`; the Permissions Matrix save handler awaits
   it and shows a snackbar instead of `alert()`;
   `handleToggleUserStatus`'s catch block now shows a real error
   snackbar via the same `enqueueSnackbar` pattern already used
   elsewhere in the file.

## Testing

- New `admin/users/form.test.jsx` (3 tests): `role_ids: []` sent (not
  `undefined`) on create with no roles selected; `EditUserPage` renders
  real fetched data, never `MOCK_USER_STORE`; a genuine `getUser: null`
  shows "User not found", never mock data.
- New `admin/Departments.test.jsx` (2 tests): write controls hidden for
  a staff-only caller, shown for a manager caller.
- `admin/users/index.jsx`'s `alert()`/refetch/toast fixes were not
  given a dedicated new test this slice (no pre-existing test file for
  that page) — verified via `eslint`, the full admin Jest suite, and a
  full `npm run build`. See Test Suggestions below.

## Test suggestions (not built this slice)

A dedicated `admin/users/index.jsx` test suite (Permissions Matrix
save/refetch, toggle-status error feedback, impersonation flow) is a
substantial page with no existing coverage at all — belongs in its own
future test-plan slice, not folded into this bug fix.

See `TP255`/`TR255`.
