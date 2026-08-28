---
id: CTX-frontend-platform-2026-08-28-admin-nav-fix
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG032, PLAN210, TP230, TR230]
---

# Admin console quick-nav: 4 missing pages + tab-highlight sync (2026-08-28)

Eighth and final fix batch from the 2026-08-28 five-role QA sweep,
closing out every real, actionable finding from the sweep's own
consolidated list.

`AdminLayout.jsx`'s own quick-nav sidebar omitted 4 real, working
`/admin/*` routes (Departments, Plans, Insurance Payers, Rights
Requests) — reachable only via the main `AppShell` sidebar's own
collapsible "Admin" section, a real navigational dead end for anyone
who lands on an `/admin/*` page first. Added all 4, grouped sensibly,
each icon matching its own page's existing header icon.

Also root-caused the bug's own lower-confidence observation about the
"Audit Log" quick-nav item staying stuck highlighted: `admin/users/
index.jsx`'s in-page tab state had no URL sync at all — clicking a tab
never changed `location.search`, so the sidebar's `isActive()` could
never have tracked a live tab switch regardless of how it compared
paths. Fixed both halves (URL sync on tab click, tab-aware comparison
in `isActive()`). One known remaining imperfection logged honestly
rather than claimed as fully resolved: "Users & RBAC" still shows
active alongside "Audit Log" on `?tab=2`, since it has no per-tab
awareness of its own.

Live-verified against the real dev stack.

## Documents

- `requirements/frontend-platform/bug/BUG032-*.md` (done)
- `implementation-plans/frontend-platform/bug/PLAN210-*.md`
- `test-plans/frontend-platform/bug/TP230-*.md`
- `test-results/frontend-platform/bug/TR230-*.md`
