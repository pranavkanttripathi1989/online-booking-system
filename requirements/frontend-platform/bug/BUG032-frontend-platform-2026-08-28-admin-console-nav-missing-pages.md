---
id: BUG032
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

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
