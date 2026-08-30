---
id: CTX-frontend-platform-2026-08-30-bug063
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG063, PLAN238, TP258, TR258, BUG058, BUG062]
---

# Manager pages audit re-check — manager/clinics fabricated data + 4 RBAC gates (2026-08-30)

User asked directly: "check on the manager pages audit" — a request to
verify `BUG058`'s own manager-page sweep rather than accept its "done"
status at face value. Two independent checks were run:

1. **Coverage check**: cross-referenced `BUG058`'s own doc (which names
   every file it examined) against a real `find frontend/src/pages/
   manager -name "*.jsx"`. Three files were never mentioned at all:
   `manager/clinics/index.jsx`, `manager/products/create.jsx`,
   `manager/resources/index.jsx`.
2. **RBAC systematic sweep**: `BUG058` had only checked 3 of 27 manager
   routes' `RoleGuard` against their backend `@Auth()`
   (`/manager/reports`, `/manager/revenue-share`, `/manager/imports`).
   Extracted all 27 routes' frontend gates programmatically and
   compared each against its real resolver.

**Findings**: `manager/products/create.jsx` was clean. The other two
missed files were not:

- **`manager/clinics/index.jsx`** — the worst DATA-13 violation found
  in this codebase to date. `useMock` fired on a real, successful
  *empty* clinics result exactly like a genuine error, and — unlike
  every prior instance of this bug class — the page's own "Backend
  unavailable, showing sample data" disclosure banner is gated on the
  error alone, so it never appeared on the empty-result path either. A
  real org with zero clinics saw 4 fully fabricated clinics ("City
  Heart Clinic" etc., fake London addresses) with **no indication
  whatsoever** that the data wasn't real.
- **`manager/resources/index.jsx`** — `resources.resolver.ts`'s read
  query allows `staff`; the frontend route was manager/admin/
  super_admin only (the same gap class as `BUG062`'s own `/admin/
  plans` finding, in the opposite direction).

The systematic RBAC sweep then found **3 more** instances of the exact
same narrower-than-backend gap, on routes `BUG058` never checked at
all: `/manager/packages` (staff-inclusive backend), `/manager/
memberships` (clinician+staff-inclusive), `/manager/clinic-forms`
(clinician+staff-inclusive, spanning both `checklist.resolver.ts` and
`intake-fields.resolver.ts`).

**Fixed all of it**: `manager/clinics/index.jsx`'s mock gate narrowed
to a genuine error only (plus new empty states, since none existed);
all four RBAC-gated routes given dedicated `RoleGuard` blocks plus a
client-side `canManage` self-gate on their own write buttons (mirroring
`BUG060`'s `admin/Departments.jsx` pattern exactly), and promoted to
top-level nav so the newly-permitted roles can actually discover them
(mirroring the `Pharmacy`/`Insurance Claims`/`Chronic Registries`
precedent). New tests for `manager/clinics`/`manager/resources` (both
previously untested); `manager/packages`/`manager/memberships`'s
existing tests updated to mock `useAuth` (their own `withProviders`
never wrapped an `AuthProvider`) plus one new staff-role test each.

Commit: `f80a07f`. Verification: `src/pages/manager` +
`src/layouts/AppShell` — 14/14 suites, 57/57 tests green at
`--maxWorkers=1`; `eslint` clean on every touched file; `npm run
build` succeeded; full `npm run lint` at 3398 warnings, under the 4908
ratchet.

**This corrects `BUG058`'s own implicit completeness claim a second
time** (the first correction was `BUG062`'s route-gate/test-fragment
finding). The pattern across both: a page-sweep audit driven by live/
DOM inspection and a spot-checked RBAC sample will miss things a
systematic file-list cross-reference and a full route-vs-@Auth diff
will catch. Both checks are cheap and mechanical — worth running as a
matter of course on any future "audit complete" claim, not just when
asked to re-check one.

See `BUG063`/`PLAN238`/`TP258`/`TR258`.
