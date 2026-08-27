---
id: BUG029
type: bug
feature: security
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG029 — `/admin/users`: "Total Users"/"Active Users" and pagination totals are wrong, and paging never stops

## Source

Found live during a Chrome-DevTools-driven admin-role QA sweep, logged in
as `admin@medibook.dev`. Reproduced deterministically by simply paging
through the real Users Directory tab.

## What's wrong, exactly

`frontend/src/pages/admin/users/index.jsx`:

- Line 412: `<StatCard ... value={users.length} label="Total Users" .../>`
- Line 413: `<StatCard ... value={users.filter((u) => u.isActive).length} label="Active Users" .../>`

`users` is `adminData?.getUsers || []` (line 356) — **the current page's
own returned array**, not an org-wide total. Confirmed live:

| Page | "Total Users" shown | Real row count returned |
|---|---|---|
| 1 | 8 | 8 |
| 2 | 4 | 4 |
| 3 | 0 | 0 (genuinely empty — 12 real users exist total) |

The bottom-left "Showing X of Y users" text (line 629) has the identical
bug — `{filteredUsers.length} of {filteredUsers.length}`, always
reporting the current page as if it were the whole dataset.

Separately, both `TablePagination`s on this page (Users Directory line
633, Audit Logs line 1042) are given `count={-1}` (MUI's "unknown total"
sentinel) with no `nextIconButtonProps` disabling logic. MUI's own docs
are explicit that `count={-1}` requires the caller to disable "next"
manually once a short page is returned — this page never does. Result:
clicking "next" past the real last page (which returned only 4 rows, a
partial page) lands on a **third, entirely empty page**, still labelled
"17–24 of more than 24" with "next" still enabled — an admin could click
"next" forever into empty pages with no indication they've reached the
end.

Root cause on the data side: `getUsers(limit, offset, role, search)`
(`backend/src/users/users.service.ts`, `backend/src/users/users.resolver.ts`)
returns a **plain array with no total count at all** — no
`paginatorInfo`, no `totalCount`, nothing for the frontend to build a
real total from. This is a real deviation from this codebase's own
established pagination contract (`{data, paginatorInfo}`, e.g.
`CLINICIANS_QUERY`'s `paginatorInfo{count currentPage hasMorePages
lastPage perPage total}`).

## Acceptance criteria

- "Total Users"/"Active Users" reflect the real org-wide total (or at
  minimum the real total matching the current filter), not the current
  page's row count — stable across every page.
- "Showing X of Y" reports a real Y, not the current page's own length.
- "Next page" disables once the real last page has been reached — no
  page can render a "17–24 of more than 24"-style empty state with
  "next" still enabled.
- Both `TablePagination` instances on this page (Users Directory, Audit
  Logs) are fixed — this is one root cause, two instances in the same
  file.
