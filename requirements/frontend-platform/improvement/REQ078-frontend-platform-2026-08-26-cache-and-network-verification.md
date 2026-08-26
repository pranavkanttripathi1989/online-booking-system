---
id: REQ078
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# REQ078 — `cache-and-network` verification for stale-prone list pages (F-21, mostly already closed)

## Source

`project-plans/analysis/02-findings-register.md` F-21, part of a 10-finding
pick-up. The plan scoped this to applying `fetchPolicy:
'cache-and-network'` to the four genuinely stale-prone list pages named
in the finding's own reasoning: the live queue board
(`pages/queue/index.jsx`), the appointments list
(`pages/appointments/index.jsx`), the calendar
(`pages/calendar/index.jsx`), and the dashboard summary
(`pages/dashboard/index.jsx`) — deliberately not the global Apollo
default, which would touch 56 pages using `useQuery`/`watchQuery` and
57 places that already locally override `fetchPolicy`, a blast radius
too wide for one slice without a page-by-page regression pass.

## Finding: already closed for all four pages

Before making any change, each page's primary query was checked. All
four — `DASHBOARD_QUERY`, `QUEUE_BOARD_QUERY`,
`APPOINTMENTS_QUERY` (both `appointments/index.jsx` and
`calendar/index.jsx`) — **already specify `fetchPolicy:
'cache-and-network'`**, from unrelated earlier work this session has no
record of a dedicated slice for. No code change was needed or made.

## What remains genuinely open, not attempted here

- The **global** Apollo default (`apollo/client.js`) is still
  `cache-first` for every `useQuery`/`watchQuery` that doesn't
  explicitly override it — the 56/57-page blast radius this plan
  deliberately stayed out of.
- The "surface partial errors instead of swallowing them" half of the
  original finding (pages that ignore a `useQuery`'s own `error` when
  `errorPolicy: 'all'` is set) was not audited in this pass.

Both are real, and both are sized for their own dedicated slice with a
page-by-page live-regression pass, not something to fold into a
10-finding pick-up that already found this specific ask done.

## Traceability

`project-plans/analysis/02-findings-register.md` F-21.
