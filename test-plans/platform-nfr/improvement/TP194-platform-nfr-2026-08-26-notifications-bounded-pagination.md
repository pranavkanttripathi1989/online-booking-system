---
id: TP194
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN174
related: []
---

# TP194 — Test plan: notifications bounded pagination

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | No read filter by default | `findAll(undefined, 200, 1, user)` | `where.is_read: undefined` |
| 2 | Unread filter applied | `findAll('unread', 200, 1, user)` | `where.is_read: false` |
| 3 | skip/take derived correctly | `findAll(undefined, 20, 3, user)` | `findMany` called with `skip: 40, take: 20` |
| 4 | paginatorInfo computed correctly | populated page | all 8 fields correct |
| 5 | Empty result, no negative firstItem | `total: 0` | `firstItem: 0` |
| 6 | `unreadCount` scoping | `unreadCount(user)` | `count({where: {user_id, is_deleted: false, is_read: false}})` |
| 7 | Resolver passthrough | `resolver.notifications('unread', 20, 2, user)` | forwards all 4 args |
| 8 | `unreadNotificationCount` passthrough | `resolver.unreadNotificationCount(user)` | forwards user |
| 9 | Bell badge uses the dedicated count, not the fetched list (the bug fixed) | 2 fetched, 47 true unread | Badge shows 47 |
| 10 | Bell renders real dropdown notifications | populated `notifications.data` | Real title shown |
| 11 | Bell honest zero state | `unreadNotificationCount: 0` | Badge shows 0 |
| 12 | Full suite regression | Backend unit + integration; frontend bell suite | 92/92 / 1530/1530; integration 4/4 / 387/387 unchanged; frontend 3/3 |
| 13 | Lint clean, ratchet unchanged | `npm run lint` | 0 errors; 1909 warnings unchanged |
