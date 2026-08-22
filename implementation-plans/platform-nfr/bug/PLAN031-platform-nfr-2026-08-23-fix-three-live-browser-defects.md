---
id: PLAN031
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG010
related: [BUG009, TP058, TR057]
---

# PLAN031 — Fix the three defects the live browser pass found

Straightforward, well-scoped fixes against already-proven patterns in this
codebase — no test-suggestions stage per `REQ013` Phase D.

## 1. Root route collision

**Approach:** don't try to make React Router pick a winner between two routes
both claiming "/" — remove the ambiguity by having exactly one route own "/",
and make that route itself auth-aware, matching the existing
`OptionalAuthShell` pattern already used for `/appointments/book` (same URL,
different content depending on auth state).

- Add `RootRoute` (`App.jsx`): `isLoading` → `FullPageLoader`; `isAuthenticated`
  → `RoleHomeRedirect` (reuse, don't duplicate `getPostLoginRedirect`);
  otherwise render `Landing` inside `Suspense`.
- Point the existing `<Route path="/" element={...}>` (under `PublicLayout`) at
  `RootRoute` instead of `Landing` directly.
- Delete the `<Route index element={<RoleHomeRedirect/>}>` under
  `ProtectedRoute`/`AppShell` — it's what was colliding, and `RootRoute` now
  covers every case it handled.
- Comment both sites explaining *why* — this is the kind of mistake that's easy
  to reintroduce by adding a future pathless layout route without checking what
  it silently claims.

## 2. Patient Appointments empty-state crash

**Approach:** match `EmptyState`'s real contract (`icon`/`title`/`subtitle`/
`actionLabel`/`onAction`), the same contract `waiting-room/index.jsx` and
`admin/Roles.jsx` already use correctly — don't invent a different one.

- `icon={<CalendarMonthIcon sx={{fontSize:48}}/>}` → `icon={CalendarMonthIcon}`
  (component reference, not a rendered element).
- `description={...}` → `subtitle={...}`.
- `action={{label, onClick}}` → `actionLabel={...}` + `onAction={...}`
  (`EmptyState` takes two separate props, not one object).

## 3. Dead `receptionist` role name

**Approach:** grep every role-keyed map/check in the frontend for the same
mistake once one instance was found — matching this project's own "the defect
has four spellings, not one" discipline (`CLAUDE.md`, on the tenant-scoping bug
class) — rather than patching only the file first encountered.

- `layouts/AppShell.jsx`'s `ROLE_COLORS`: rename `receptionist` → `staff`.
- `pages/admin/users/index.jsx`'s `ROLE_STYLES`: replace the entire stale
  `system_admin`/`clinic_manager`/`receptionist` key set with the real
  `admin`/`super_admin`/`manager`/`clinician`/`staff`/`patient` names from
  `backend/prisma/seed.ts`'s `ROLES` array.
- `pages/clinicians/index.jsx`'s `isAdmin` check: `['admin','super_admin',
  'receptionist']` → `['admin','super_admin','manager','staff']`, matching the
  role set `AppShell`'s own `NAV_CONFIG` already grants this page to.
- Checked (not fixed): `components/shared/RoleBadge.jsx` already has both keys
  — no bug. `components/shared/StitchStatusChip.jsx`'s `receptionist` entry is
  unreachable dead code (only ever called with payment statuses) — left alone.
  `components/Settings/UserManagement.jsx` has zero importers anywhere — left
  alone, per "fixing dead code teaches nothing live."

## Verification plan

See `TP058`.
