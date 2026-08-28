---
id: PLAN210
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG032]
---

# PLAN210 — Admin console quick-nav: 4 missing pages + tab-highlight sync

## Missing pages

`AdminLayout.jsx`'s `NAV_SECTIONS` gained 4 entries: Rights Requests
(Users & Access), Plans + Insurance Payers (System), Departments
(Reference Data) — each icon matching its own page's existing header
icon.

## Active-highlight root cause and fix

`admin/users/index.jsx#adminTab` was pure local state with no URL
sync — clicking a tab never changed `location.search`, so
`AdminLayout.jsx`'s query-string-stripping `isActive()` could never
have reflected a live tab switch regardless of its own comparison
logic. Fixed both sides:

- `admin/users/index.jsx`: tab `onClick` now also calls
  `setSearchParams({tab: String(i)}, {replace: true})` (cleared
  entirely for tab 0).
- `AdminLayout.jsx#isActive()`: compares the `tab` search param when
  an item's own configured path carries one.

Known remaining gap, not chased further: "Users & RBAC" (no query in
its own path) still shows active alongside "Audit Log" on `?tab=2`,
since it has no per-tab awareness — see the bug's own resolution note
for why this wasn't extended to full mutual exclusivity in this pass.

## Testing

`npx eslint` clean (0 new errors) on both touched files. Live-verified
against the real dev stack — see `TR230`.
