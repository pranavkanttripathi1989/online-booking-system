---
id: BUG010
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG009, F-18]
---

# BUG010 — The live browser pass BUG009 couldn't run found three real defects

## Severity

S1/S2 mixed. One S1 (the public landing page — the primary anonymous entry
point for a booking SaaS — was unreachable for every visitor, always), two S2
(a hard crash on a real, reachable empty state; wrong role identity shown
throughout the authenticated app for every staff/receptionist account).

## How this was found

`BUG009` closed six fabricated pages onto real backends but explicitly flagged
its own gap: *"No live browser verification... Playwright/Chrome MCP were
unavailable... nobody has driven the routes against real data."* This bug is
that verification pass, run once Playwright became available: headless
Chromium driven through the real login flow for each relevant demo role,
screenshotting `/`, `/analytics`, `/clinician/patients`, `/patient/appointments`,
`/staff/appointments`, and `/staff/dashboard` against a real (freshly migrated
and seeded) backend.

Running it required first discovering the environment itself had never been
bootstrapped on this machine — a brand new `postgres_data` volume with
migrations never applied — which produced a real, independent-of-this-bug
finding: a migrated-but-unseeded database doesn't fail login cleanly, it leaks
a raw `PrismaClientKnownRequestError` (`table public.UserProfiles does not
exist`) straight to the browser. Recorded in `CLAUDE.md`'s setup steps rather
than as its own bug, since the fix is "run the documented seed step," not a
code change.

## The three defects

### 1. `/` was unreachable for every visitor, always (S1)

`App.jsx` declared "/" twice: once explicitly (`<Route path="/"
element={<Landing/>}>` under `PublicLayout`), and once implicitly, via a
pathless `<Route index element={<RoleHomeRedirect/>}>` nested under two more
pathless layout routes (`ProtectedRoute` → `AppShell`) that don't themselves
consume a path segment. React Router v6 scores an `index` route higher than an
explicit `path="/"` route on an otherwise-tied match, so the index route always
won. An authenticated visitor to "/" got silently redirected to their
dashboard — looked correct, wasn't meant to happen that way, and masked the
bug. An anonymous visitor got carried through `ProtectedRoute`'s own
`isAuthenticated` check straight to `/login`. The public marketing/booking
landing page — every SEO link, every "Book Now" CTA, the entire anonymous
funnel — never rendered for anyone. No existing test caught it because every
e2e spec logs in first and lands on a role-specific path; none start at "/" and
assert on Landing's own content.

### 2. Patient Appointments white-screened on the empty state (S2)

`pages/patient/Appointments.jsx`'s empty-state branch passed
`icon={<CalendarMonthIcon sx={{fontSize:48}}/>}` to `EmptyState`, which expects
a component reference (`icon: Icon = InboxIcon`, then renders `<Icon/>`
internally) — not an already-rendered element. React cannot use a rendered
element as a component type: `Element type is invalid: expected a string... but
got: object`, an uncaught render crash with no error boundary above it, so the
whole page went blank. Any patient with zero appointments — which is every
patient on a freshly seeded database, and plausibly many real patients before
their first booking — hit this. The same call site also passed
`description`/`action` props that don't exist on `EmptyState` (real props are
`subtitle`/`actionLabel`/`onAction`) — those failed silently rather than
crashing, which is exactly why they went unnoticed until the icon prop's type
mismatch forced a crash.

### 3. `receptionist` is a dead role name; the real one is `staff` — recurring, not a one-off (S2)

`backend/prisma/seed.ts`'s `ROLES` array and every real JWT/RBAC check use
`staff`; `receptionist` has never been a real seeded role. Confirmed live in
three places that keyed a role-to-display map off the dead name and had no
`staff` fallback:

- `layouts/AppShell.jsx`'s `ROLE_COLORS` — every staff/receptionist account's
  sidebar/topbar badge fell through to `ROLE_COLORS.patient` and showed
  "Patient".
- `pages/admin/users/index.jsx`'s `ROLE_STYLES` — used an entirely different
  stale naming scheme (`system_admin`/`clinic_manager`/`receptionist`) that no
  real account has ever had, so admin, super_admin, manager, *and* staff users
  all fell back to a grey "Unknown" chip in the Users directory.
- `pages/clinicians/index.jsx`'s inline `isAdmin` check — missing `staff`
  entirely, hiding the "Add Clinician" button from staff users who
  `AppShell`'s own nav config already grants this page to.

`App.jsx`'s `NAV_CONFIG` already lists both `'receptionist'` and `'staff'` in
its role arrays — harmless there, since `'staff'` is also present — which is
likely why the dead name kept getting copied forward as if it were correct.

## Fix

See the three `fix(frontend)` commits on `master` (2026-08-23): `RootRoute`
auth-aware root handling replacing the two competing "/" routes;
`EmptyState`'s call site corrected to the real `icon`/`subtitle`/
`actionLabel`/`onAction` contract; all three dead-name sites re-keyed to
`staff` (and, for `admin/users/index.jsx`, to the real
admin/super_admin/manager/clinician/staff/patient set).

## Verification

Live Playwright screenshots of all six pages, before and after each fix,
confirmed the crash/redirect/badge behavior directly (not inferred from code
reading). `frontend` eslint clean on every touched file (0 new
errors/warnings). `e2e/auth-login.spec.js` (2/2),
`e2e/dashboard.spec.js` (3/3), and `e2e/manager-staff.spec.js` (2/2, one
re-run in isolation) all green single-threaded — ruling out a routing
regression from removing the `AppShell` index route. See `TR057`.

## What this does not close

- `e2e/manager-clinicians-patients.spec.js`'s five tests still fail on this
  machine — not a regression from this bug's fixes, but because this is a
  freshly migrated-and-seeded database with none of the ad hoc clinician/
  patient/clinic fixtures a longer-running dev database accumulates (e.g. a
  seeded clinician literally named "Sarah Mitchell" at a specific id these
  specs hardcode). Making the e2e suite's fixture dependency explicit and
  reproducible — rather than an implicit property of whichever machine last
  ran it — is real work, out of scope here.
- `admin/users/index.jsx`'s `ROLE_STYLES` fix only corrects the visual/color
  mapping; it does not audit whether the page's role-editing flows themselves
  handle `admin`/`super_admin`/`manager`/`staff` correctly end to end.
- `components/Settings/UserManagement.jsx` has the same `receptionist`-only
  role list, plus no `manager`/`staff` options at all — left alone, since the
  component has zero importers anywhere in the app (confirmed by grep) and
  fixing dead code teaches nothing live.
