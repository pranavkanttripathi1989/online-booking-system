---
id: BUG032
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: []
---

## Resolution (2026-08-28, `PLAN210`)

Added all 4 missing pages to `NAV_SECTIONS`, grouped per the
acceptance criteria's own suggestion: Rights Requests under "Users &
Access", Plans and Insurance Payers under "System", Departments under
"Reference Data" — each with the same icon its own page header already
uses (`GavelIcon`, `WorkspacePremiumIcon`, `LocalHospitalIcon`,
`CategoryIcon`).

Also root-caused and fixed the lower-confidence active-highlight
observation: `admin/users/index.jsx`'s `adminTab` was pure local React
state with **no URL sync** — clicking a tab never changed
`location.search` at all, so `AdminLayout.jsx`'s `isActive()` (which
strips the query string before comparing) could never have tracked a
live tab switch by design, regardless of how it compared paths. Fixed
both halves: `admin/users/index.jsx`'s tab `onClick` now calls
`setSearchParams` to keep `?tab=` in sync (also making the URL
shareable/bookmarkable to a specific tab, not just page-load-only);
`isActive()` now compares the `tab` param when an item's own configured
path carries one (`Audit Log` → `?tab=2`).

**Known remaining imperfection, not fully resolved**: "Users & RBAC"
(no query in its own path) still shows active alongside "Audit Log"
when `?tab=2` is open, since it has no per-tab awareness of its own —
it's the parent entry for the whole `/admin/users` route, including the
un-navved "Permissions Matrix" tab (index 1), so making it exclude
`tab=2` specifically would need sibling-aware logic this fix didn't
add. This is a real improvement over the original "stuck" behavior
(Audit Log now correctly activates/deactivates matching the real tab)
but not a fully mutually-exclusive highlight — logged here rather than
silently claimed as complete.

Live-verified as `admin@medibook.dev`: all 4 new pages appear and
navigate correctly; clicking "Audit Logs" updates the URL to
`?tab=2` and highlights "Audit Log"; clicking back to "Users Directory"
clears the query string and de-highlights it. See `TR230`.

# BUG032 — Admin Console's own quick-nav sidebar omits 4 real admin pages

## Source

Found live during a Chrome-DevTools-driven admin-role QA sweep. The
main `AppShell` sidebar's collapsible "Admin" section (13 items) and
the separate in-page "ADMIN CONSOLE" quick-nav rendered by
`frontend/src/layouts/AdminLayout.jsx` (shown down the left side of
every `/admin/*` page) list different sets of pages.

## What's wrong, exactly

`frontend/src/layouts/AdminLayout.jsx`'s `NAV_SECTIONS` (lines 20–43)
lists 10 items across "Users & Access" / "System" / "Reference Data".
It has no entry at all for:

- `/admin/departments` (Departments — real route, `App.jsx` line 1033)
- `/admin/plans` (Plans — real route, `App.jsx` line 1041)
- `/admin/payers` (Insurance Payers — real route, `App.jsx` line 1094)
- `/admin/rights-requests` (Rights Requests — real route, `App.jsx` line 1102)

All four exist, work, and are reachable via the main `AppShell` sidebar
directly (confirmed live) — this is not a broken route, just a missing
shortcut. But it means an admin who navigates into any `/admin/*` page
first (landing on this quick-nav) has no way to reach those 4 pages
without going back out to the main collapsible "Admin" section — a real
navigational dead end for anyone who doesn't already know those routes
exist by other means (`NAV-1`/`NAV-2`: keep taps low, IA depth bounded).

**Lower-confidence, noted but not fully root-caused**: while investigating
this, the "Audit Log" quick-nav item was observed staying visually
highlighted/active even after switching to the "Permissions Matrix" tab
within the same `/admin/users` page (a different in-page tab, same
URL path). `isActive()` (line 52) strips the query string from a nav
item's own configured `path` before comparing — reading the code alone,
this should make "Users & RBAC" and "Audit Log" equally active
whenever anywhere under `/admin/users`, which doesn't fully explain the
single-item highlight actually observed. Flagging as a real, reproduced
visual observation; the exact mechanism needs a closer look before
fixing.

## Acceptance criteria

- `NAV_SECTIONS` includes all four missing pages, grouped sensibly
  (e.g. Departments under "Reference Data", Plans under "System",
  Insurance Payers under a payer/insurance section if one exists,
  Rights Requests under "Users & Access" alongside the DPDP-adjacent
  Audit Log).
- The quick-nav's active-item highlighting is verified correct across
  every real tab switch on `/admin/users` (Users Directory / Permissions
  Matrix / Audit Logs), not just the page-level route.
