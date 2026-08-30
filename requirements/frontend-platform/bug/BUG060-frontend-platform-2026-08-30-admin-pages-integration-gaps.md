---
id: BUG060
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN235, TP255, TR255]
---

# BUG060 — 7 integration gaps in `frontend/src/pages/admin/`

## How it was found

Continuation of the "check all fronend page and fix the backend and
fronend intgartionn gap" audit — the `admin/` slice, run as a
background research agent against the same six gap classes as the
`manager/` slice (`BUG058`).

## What was found and fixed

1. **SEC-18 — `/admin/users*` route narrower than backend `@Auth`**:
   `App.jsx` gated `admin`/`super_admin` only; `users.resolver.ts` gates
   `getUsers`/`getUsersStats`/`getUser` with `manager` too. Fixed by
   moving `/admin/users`, `/admin/users/new`, `/admin/users/:id/edit`
   into the existing "admin OR manager" `RoleGuard` block.
2. **SEC-18 — `/admin/departments` route narrower than backend
   `@Auth`**: `departments.resolver.ts`'s read queries allow `manager`
   AND `staff`; the route was `admin`/`super_admin` only. Fixed with a
   new dedicated `RoleGuard` block (`admin`, `super_admin`, `manager`,
   `staff`) — plus self-gating the Add/Edit/Delete controls inside
   `Departments.jsx` for a staff-only caller (`canManage`), since the
   *write* mutations stay manager/admin/super_admin-only on the
   backend, matching `Payers.jsx`'s existing convention.
3. **DATA-13 + missing not-found guard — `admin/users/form.jsx`'s
   `EditUserPage`**: `data?.getUser ?? MOCK_USER_STORE[id] ?? {name:
   '', ...}` fired on ANY falsy result (real error, deleted/not-found
   user, or a transient race), never distinguishing them. Fixed to gate
   the mock on a genuine `error` only, and added a real "User not
   found" state for a genuine null result.
4. **Fabricated success on a real mutation failure —
   `admin/users/form.jsx`'s `createUser` `onError`**: a `networkError`
   showed `'User "X" created (mock mode — backend offline)'` and
   navigated away as if it succeeded, when no user was created. Fixed
   to show the real error and stay on the page.
5. **GraphQL contract bug — `role_ids: undefined` on a required field
   — `admin/users/form.jsx`'s `createUser` call**: `UserInput.role_ids`
   has no `{nullable: true}` on the backend; sending `undefined` for an
   empty selection stripped the key, and GraphQL rejected the mutation
   at variable-coercion time before the resolver ran. Fixed to always
   send the real (possibly empty) array.
6. **WV-5 (banned `alert()`) + DATA-9 (missing refetch) —
   `admin/users/index.jsx`'s Permissions Matrix save handler**: called
   `alert('Saved!')` and never refetched `GET_RBAC_DATA` (default
   `cache-first`), so switching roles and back served stale pre-save
   permissions from Apollo's cache. Fixed to use a snackbar and
   `refetchRbac()`.
7. **Silent mutation failure — `admin/users/index.jsx`'s
   `handleToggleUserStatus`**: its `catch` block only did
   `console.error`, giving the admin zero feedback on a failed
   activate/deactivate toggle (inconsistent with the same file's own
   `handleConfirmImpersonate`). Fixed to show a real error snackbar.

## Not fixed this slice (out of scope / deferred, not silently dropped)

Every other admin page/domain audited (`ClinicianTypes`, `RoomTypes`,
`Languages`, `EmailTemplates`, `Organizations`, `Roles`, `Plans`,
`Payers`, `RightsRequests`, `Communications`, `Policies`) was confirmed
clean — mock fallbacks correctly error-gated, mutations correctly
refetch, route gates correctly match backend `@Auth()`, no
`TableContainer` gaps.

See `PLAN235`/`TP255`/`TR255`.
