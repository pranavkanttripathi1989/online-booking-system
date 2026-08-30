---
id: PLAN238
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG063
related: [BUG063, TP258, TR258]
---

# PLAN238 — fix manager/clinics fabricated data + 4 manager-page RBAC gates

## Scope

`frontend/src/pages/manager/clinics/index.jsx` (+ new
`index.test.jsx`), `frontend/src/pages/manager/resources/index.jsx`
(+ new `index.test.jsx`), `frontend/src/pages/manager/packages/
index.jsx` (+ existing `index.test.jsx`), `frontend/src/pages/manager/
memberships/index.jsx` (+ existing `index.test.jsx`), `frontend/src/
pages/manager/clinic-forms/index.jsx`, `frontend/src/App.jsx` (route
regrouping), `frontend/src/layouts/AppShell.jsx` (nav promotion). No
backend change — every gap is a frontend gate narrower than an
already-shipped backend contract, or a frontend-only fallback bug.

## Approach

1. **`manager/clinics/index.jsx`**: `useMock` narrowed from
   `apiClinics.length === 0 && !clinicsLoading` to `!!clinicsError`.
   Added a real empty-state message for both the Clinics and Rooms tabs
   (neither existed before — a genuine empty result used to render a
   silent blank grid, since the DATA-13 fallback previously papered
   over that gap with fake data). Dropped the now-unused
   `clinicsLoading` destructure.
2. **`manager/resources/index.jsx`**: added `useAuth`/`canManage`
   (manager/admin/super_admin), gated the "Add Resource" button and the
   per-card Edit/Delete icon buttons.
3. **`manager/packages/index.jsx`**: identical `canManage` gate on
   "New Package" and the per-card Edit/Delete icons. No purchase/
   transfer UI exists on this page to worry about — confirmed by grep,
   not assumed.
4. **`manager/memberships/index.jsx`**: identical `canManage` gate on
   "New Plan" and the per-card Edit/Delete icons. No enroll/cancel UI
   exists on this page either — its own subtitle text says enrollment
   happens "from their own detail page."
5. **`manager/clinic-forms/index.jsx`**: identical `canManage` gate on
   both tabs' "Add Item"/"Add Field" buttons and each table row's
   Edit/Delete icons. No `completeChecklistItem` UI exists on this page
   — it's a config-only page; the actual "complete this checklist item"
   action lives elsewhere (queue/encounter flow), unaffected by this
   change.
6. **`App.jsx`**: moved `/manager/packages`, `/manager/memberships`,
   `/manager/clinic-forms`, `/manager/resources` out of the shared
   `['admin','super_admin','manager']` block into four separate
   dedicated `RoleGuard` blocks (staff-inclusive for
   packages/resources; clinician+staff-inclusive for
   memberships/clinic-forms) — matching the existing `/manager/
   registries`/`/queue` precedent of a dedicated block per gap rather
   than widening the shared one, which would have over-granted every
   other route inside it.
7. **`AppShell.jsx`**: promoted all four from the manager-only-visible
   `MANAGER_CHILDREN` collapsible section to the top-level nav array
   with per-item `roles`, matching the existing `Pharmacy`/`Insurance
   Claims`/`Chronic Registries` precedent — otherwise a real staff/
   clinician caller who could now reach these routes directly had no
   way to discover them from the sidebar at all.

## Testing

- New `manager/clinics/index.test.jsx` (3 tests): a real empty result
  shows the new empty state, never `CLINICS_DATA`; a genuine error
  falls back to sample data with the disclosure banner visible; a real
  fetched clinic renders correctly.
- New `manager/resources/index.test.jsx` (2 tests): a manager sees the
  resource and all three write controls; a staff caller sees the
  resource but none of them.
- `manager/packages/index.test.jsx` and `manager/memberships/
  index.test.jsx` (pre-existing): added `jest.mock('../../../context/
  AuthContext', ...)` (their own `withProviders` never wrapped an
  `AuthProvider`, and `useAuth()` throws without one — the same fix
  `admin/Departments.test.jsx` already applied for the identical
  pattern), plus one new staff-role test each proving the write
  controls are genuinely absent from the DOM, not merely disabled.
- Full re-run: `src/pages/manager` + `src/layouts/AppShell` — 14/14
  suites, 57/57 tests, clean at `--maxWorkers=1` (2 suites,
  `manager/claims/index` and `manager/imports/index`, flaked once
  under `--maxWorkers=2` parallel contention and passed cleanly alone —
  confirmed pre-existing, unrelated to this change).
- `eslint` on every touched file: 0 errors. `npm run build`: succeeded.
- Full `npm run lint`: 0 errors, 3398 warnings (under the 4908 ratchet,
  one more than the prior count from the new test files' own
  pre-existing i18n-string warning class).

See `TP258`/`TR258`.
