---
id: REQ121
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ078
related: [PLAN161, TP181, TR181]
---

# REQ121 — `cache-and-network` audit, round 2 (F-21 continued)

## Why this slice

`REQ078` verified the four pages F-21's own reasoning named (dashboard,
queue, appointments, calendar) already used `cache-and-network`, and
explicitly logged what it deliberately left open: *"the global Apollo
default is still `cache-first`... a blast radius too wide for one slice
without a page-by-page regression pass"* — but also implicitly left
unaudited every OTHER page that isn't the global default and isn't one
of those four. This slice is that continuation: a bounded audit of
additional high-traffic list/dashboard pages, still explicitly NOT the
global default flip (same blast-radius reasoning `REQ078` already gave,
unchanged).

## Method

Grepped every page using the `useQuery` hook (not the `client.query()`
imperative pattern — those already default to `network-only` per
established convention, confirmed on `manager/services/index.jsx` and
siblings) for a primary query with no `fetchPolicy` override, then
judged each by the same test F-21 itself uses: does a mutation
elsewhere (a different tab, another staff member, a background sweep)
leave this page showing stale data with no way to see it's stale short
of a hard refresh?

## What was found and fixed

Five files, on real, judged-stale-prone queries:

| File | Query | Why stale-prone |
|---|---|---|
| `pages/staff/index.jsx` | `GET_STAFF` | A deactivation elsewhere leaves a "still active" row showing |
| `pages/reviews/index.jsx` | `GET_REVIEWS` | A new review or another staff member's response/delete goes unseen |
| `pages/admin/users/index.jsx` | `GET_ADMIN_DATA`, `GET_AUDIT_LOGS` | A user directory and an audit log are exactly the "never show stale" case |
| `pages/clinician/Calendar.jsx` | `GET_WEEK_APPOINTMENTS`, `GET_LUNCH_BREAKS` | A booking made through the patient portal or front desk while this tab sits open |
| `pages/manager/Dashboard.jsx` | `GET_MANAGER_DASHBOARD_DATA`, `GET_MANAGER_TRANSACTIONS` | A KPI dashboard showing yesterday's numbers on a stale cache hit |

## What remains genuinely open, not attempted here

Same two items `REQ078` already logged, unchanged:

- The global Apollo default (`apollo/client.js`) — still `cache-first`
  for every query that doesn't explicitly override it.
- The "surface partial errors instead of swallowing them" half of
  F-21 — not audited in this pass either.

Both remain sized for their own dedicated slice with a page-by-page
live-regression pass, per `REQ078`'s own reasoning.

## Traceability

`project-plans/analysis/02-findings-register.md` F-21; `REQ078` (round 1).
