---
id: CTX-platform-nfr-2026-08-26-req134
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ134
related: [PLAN174, TP194, TR194]
---

# platform-nfr — REQ134: notifications bounded pagination (2026-08-26)

First slice of the next 10-slice batch (`project-plans/analysis/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ134 | [notifications bounded pagination](../../requirements/platform-nfr/improvement/REQ134-platform-nfr-2026-08-26-notifications-bounded-pagination.md) |
| implementation-plans | PLAN174 | [implementation plan](../../implementation-plans/platform-nfr/improvement/PLAN174-platform-nfr-2026-08-26-notifications-bounded-pagination.md) |
| test-plans | TP194 | [verification plan](../../test-plans/platform-nfr/improvement/TP194-platform-nfr-2026-08-26-notifications-bounded-pagination.md) |
| test-results | TR194 | [verification results — pass](../../test-results/platform-nfr/improvement/TR194-platform-nfr-2026-08-26-notifications-bounded-pagination.md) |

## What shipped

`REQ133` deliberately deferred `notifications` when migrating
`testResults` to `{data, paginatorInfo}`. This closes it — the second
of F-14's own three named unbounded resolvers.

A real correctness bug was found and fixed while planning the
migration, not discovered after shipping: `NotificationBell.jsx`'s
unread badge counted client-side over the same list it displayed —
harmless while unbounded, but a real undercounting bug the moment the
query became bounded (which this slice does by design). New
`unreadNotificationCount` query (a decoupled DB `count()`) now drives
both the bell's badge and the notifications page's own "Unread (N)"
label.

## Verification

Backend: 92/92 unit suites, 1530/1530 tests (5 new); integration 4/4
suites, 387/387 unchanged (`notifications` is deliberately exempt from
the tenancy matrix, no fixture fix needed). `tsc --noEmit`/`eslint`
clean. Frontend: `NotificationBell.test.jsx` 3/3 (new), `eslint` clean,
full lint ratchet unchanged at 1909.
