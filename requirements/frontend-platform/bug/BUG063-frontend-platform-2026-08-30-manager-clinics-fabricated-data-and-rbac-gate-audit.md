---
id: BUG063
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN238, TP258, TR258, BUG058, BUG062]
---

# BUG063 — manager/clinics/index.jsx fabricated data + 4 manager-page RBAC gates narrower than backend

## How it was found

User asked directly: "check on the manager pages audit" — a request to
verify `BUG058`'s own manager-page sweep (the first of the four slices
in "check all fronend page and fix the backend and fronend intgartionn
gap"), not just accept its "done" status. `BUG058`'s own doc explicitly
lists which files it checked; cross-checking that list against a real
`find frontend/src/pages/manager -name "*.jsx"` found **3 files never
mentioned at all**: `manager/clinics/index.jsx`, `manager/products/
create.jsx`, `manager/resources/index.jsx`. `products/create.jsx` and
the non-DATA-13 parts of `resources/index.jsx` were clean; the other
two were not. A follow-on systematic RBAC cross-check (extracting every
`/manager/*` route's frontend `RoleGuard` and comparing against its
real backend `@Auth()`, across all 27 manager pages — something
`BUG058` had only done for 3 of them) found 3 more real gaps.

## What was found and fixed

1. **DATA-13 — `manager/clinics/index.jsx`'s `useMock`, the worst
   instance of this bug class found in this codebase so far.**
   `useMock = apiClinics.length === 0 && !clinicsLoading` fired on a
   real, successful **empty** clinics result exactly the same as a
   genuine query error — and unlike every other DATA-13 violation found
   in this repo's history, there was **no visible indicator at all**
   distinguishing the two: the page's own "Backend unavailable —
   showing sample data" banner is gated on `clinicsError`, which stays
   falsy on the empty-but-successful path, so a real org with zero real
   clinics silently saw 4 fully fabricated clinics ("City Heart Clinic",
   "Central Medical Centre", "Family Health Hub", "Westside Physio &
   Sports", with fake London addresses) with nothing marking them as
   sample data. Fixed to `useMock = !!clinicsError` — an empty result
   now renders a real, honest empty state (added, since none existed).
2. **SEC-18 — `/admin/plans` gated wider than `@Auth('super_admin')`**
   (found first, already fixed and shipped as `BUG062`, listed here
   only for completeness — not re-fixed).
3. **SEC-18 — 4 more manager routes gated narrower than their real
   backend `@Auth()`**, the identical gap class `BUG060`
   (`/admin/users`, `/admin/departments`) and `BUG062`
   (`/manager/resources`) already fixed once each, found here on a full
   systematic sweep `BUG058` never did:
   - `/manager/packages` — `packages.resolver.ts`'s `packages` query is
     `@Auth(...CATALOG_STAFF_ROLES)` (staff-inclusive); frontend route
     was manager/admin/super_admin only.
   - `/manager/memberships` — `memberships.resolver.ts`'s
     `membershipPlans` query is `@Auth(...MEMBERSHIP_VIEWER_ROLES)`
     (clinician+staff-inclusive); frontend route excluded both.
   - `/manager/clinic-forms` — both `checklist.resolver.ts`'s
     `checklistItems`/`checklistCompletions` and
     `intake-fields.resolver.ts`'s `intakeFieldConfigs` are
     clinician+staff-inclusive; frontend route excluded both.
   - `/manager/resources` — already fixed as `BUG062`.

   Each gets its own dedicated `RoleGuard` block (not a widened shared
   block, which would over-grant every other route inside it) plus a
   `canManage` client-side self-gate on the page's own create/edit/
   delete buttons — mirroring the exact pattern `BUG060` established for
   `admin/Departments.jsx`. `manager/packages/index.jsx` and
   `manager/memberships/index.jsx` had **existing** tests that assumed
   every caller could manage — both updated to mock `useAuth` (matching
   `admin/Departments.test.jsx`'s own established mocking pattern) and
   each gained one new staff-role test proving the write controls are
   truly absent, not just disabled.

## Not fixed this slice (deliberately, and why)

- `manager/products/create.jsx` — read, confirmed clean (no mock, no
  RBAC issue; the route sits behind the same manager-only gate its
  backend `createProduct` mutation actually requires).
- The `packages`/`memberships`/`checklist` backend routes' own
  staff-facing write actions (`purchasePackage`/`transferPackage`,
  `enrollPatientMembership`/`cancelPatientMembership`,
  `completeChecklistItem`) have no UI on these specific admin/config
  pages at all — confirmed by grep, not assumed — so nothing needed
  gating for them here; if a future slice adds that UI elsewhere, it
  inherits the already-widened backend contract, not a new one.
- `AdminLayout.jsx`'s own sidebar (used by `/admin/plans` and others)
  renders an unfiltered link list regardless of the caller's real role
  — a pre-existing, broader UX gap unrelated to this bug's own RBAC
  findings (the route `RoleGuard` remains the real security boundary),
  not fixed here to avoid scope creep into an unrelated page family.

See `PLAN238`/`TP258`/`TR258`.
