---
id: PLAN174
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ134
related: [TP194, TR194]
---

# PLAN174 — Implementation plan: notifications bounded pagination

## Change

**`backend/src/notifications/entities/notification.entity.ts`**: new
`NotificationPaginatorInfoType`/`NotificationPaginatedType`, matching
`TestResultPaginatedType`'s own per-domain-type convention.

**`backend/src/notifications/notifications.service.ts`**: `findAll`
gains `first`/`page` parameters, running inside
`this.prisma.$transaction([count, findMany])` with the identical
pagination math `test-results.service.ts#findAll` (`REQ133`) already
uses. New `unreadCount(user)` — a plain `count()` scoped to
`{user_id, is_deleted: false, is_read: false}`, deliberately decoupled
from `findAll`'s own bounded fetch.

**`backend/src/notifications/notifications.resolver.ts`**: `notifications`
now returns `NotificationPaginatedType`; new `first`/`page` args,
`defaultValue: 200`/`1`. New `unreadNotificationCount` query (`Int`).
Both remain ungated (`notifications.resolver.spec.ts`'s own existing
test already documents access control here is per-caller self-scoping,
not role — unchanged).

**`frontend/src/components/shared/NotificationBell.jsx`**: `GET_NOTIFICATIONS`
now requests `{data {...}}` with `first: 20` (a dropdown only ever needs
a handful of recent items, not the full 200-row default). New
`GET_UNREAD_COUNT` query drives the badge directly, replacing the old
`list.filter(n => !n.is_read).length`. Both queries refetch together on
every mutation (`refetchAll`).

**`frontend/src/pages/notifications/index.jsx`**: `GET_NOTIFICATIONS`
updated to the new shape; `notifications = data?.notifications?.data ??
...`. New `GET_UNREAD_COUNT` query now drives `unreadCount`/`hasUnread`
(previously computed from the fetched list) — kept the `error`-gated
client-side fallback computation only for the genuine mock-fallback
path (`MOCK_NOTIFICATIONS`, which has no backing count query). The
shared `run()` mutation helper now refetches both queries.

`notifications` is deliberately **not** in the tenancy matrix
(`domain-cases.ts`'s own comment: user-scoped, not org-scoped, doesn't
fit the matrix's same-org-sees-same-row shape) — confirmed no fixture
fix was needed this slice, unlike `REQ133`'s own `testResults` migration.

## Testing

`backend/src/notifications/notifications.service.spec.ts`: existing 3
`findAll` call sites updated to the new 4-argument signature; mock
gains `count`/`$transaction`. 5 new cases: skip/take derived from
page/first, a correctly-computed `paginatorInfo`, a zero-total empty
result never reporting a negative `firstItem`, and `unreadCount`
scoping to the caller's own unread/non-deleted rows.

`backend/src/notifications/notifications.resolver.spec.ts`: updated the
existing `notifications` passthrough test to the new signature; added
`unreadNotificationCount` passthrough and role-gating coverage.

`frontend/src/components/shared/NotificationBell.test.jsx` (new — this
widget had zero test coverage before this slice): the badge shows the
dedicated count (47) even when only 2 notifications were fetched for
the dropdown — the exact bug this slice fixes, proven directly; real
notifications render in the dropdown; an honest zero-unread state.

Full backend unit suite: 92/92 suites, 1530/1530 tests (5 new).
Integration suite: 4/4 suites, 387/387 unchanged (no tenancy-matrix
fixture touch needed). `tsc --noEmit`/`eslint` clean on backend.
Frontend: new widget suite 3/3, `eslint` clean on all touched files (12
pre-existing warnings on `NotificationBell.jsx`, 13 on
`notifications/index.jsx`, both confirmed identical before/after this
slice's edits); full `npm run lint` unchanged at 1909.

## Documentation

`REQ134` (this requirement, includes the badge-accuracy bug found while
planning), `PLAN174` (this plan), `TP194`/`TR194` (verification), a
context bundle, and index updates across all five doc roots plus the
`platform-nfr` feature README.
