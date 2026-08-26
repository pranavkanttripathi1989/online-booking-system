---
id: REQ134
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [PLAN174, TP194, TR194]
---

# REQ134 — Bounded pagination for `notifications` (F-14 residue)

## Why this slice

`REQ133`'s own doc deliberately deferred `notifications` when it
migrated `testResults` to `{data, paginatorInfo}`, reasoning that a
single caller's own notification list is bounded by nature and lower
risk than org-wide clinical data. That reasoning still holds, but F-14's
own finding named all three domains (`testResults`, `notifications`,
`threads`) as needing the real per-domain migration, not just the
global safety-net middleware — this closes the second of the three.

## A real correctness bug found while planning the migration, not after

`NotificationBell.jsx` (the AppBar dropdown) computed its unread badge
count as `list.filter(n => !n.is_read).length` over the *same* list it
rendered in the dropdown. That was harmless while the query fetched
every notification unconditionally, but becomes a real undercounting
bug the moment the query is bounded (which this slice does by design,
per F-14's own fix) — a caller with more unread notifications than fit
in one fetched page would see a badge lower than their true unread
count. `pages/notifications/index.jsx`'s own "Unread (N)" tab label had
the identical latent risk. Found and fixed as part of this slice, not
discovered after shipping.

## User story

As a user with a large notification history, I want the notification
list to be served from a genuinely bounded query, and I want the unread
badge to always show my true unread count regardless of how many
notifications are actually fetched for display.

## Acceptance criteria

- **Given** the `notifications` query, **then** it returns `{data,
  paginatorInfo}`, not a bare unbounded array.
- **Given** no `first`/`page` supplied, **then** the resolver defaults
  to `first: 200` (matching `clampTakeMiddleware`'s own ceiling) —
  identical behaviour to before this slice for every caller under that
  size.
- **Given** any number of unread notifications, **then** the bell's
  badge and the notifications page's own "Unread (N)" label both show
  the true total, sourced from a dedicated `unreadNotificationCount`
  query — never a count over a possibly-truncated fetched list.
- **Given** a mutation that changes read state (mark-read, mark-all-read,
  delete), **then** both the list and the unread count refetch together.

## In scope

- `NotificationPaginatedType`/`NotificationPaginatorInfoType` (backend),
  `findAll`'s pagination math (mirrors `REQ133`'s own
  `test-results.service.ts#findAll` exactly), `notifications(first,
  page)` resolver args.
- New `unreadNotificationCount` query — a real, decoupled DB `count()`.
- `NotificationBell.jsx` (bounded to `first: 20` for the dropdown) and
  `pages/notifications/index.jsx` (bounded to the default 200) both
  updated to match (Hard Rule 7), and both switched to the new
  dedicated count query for badge/label accuracy.

## Deliberately out of scope

- `threads` (messages) — still deferred, per `REQ133`'s own reasoning:
  real N+1/complexity concerns already flagged there, not worth
  disturbing without its own dedicated slice.
- No pagination *controls* added to the notifications page UI — the
  existing filter-tab UX is unchanged; a genuine "load more" is a
  future follow-on once a caller realistically exceeds 200 notifications.
