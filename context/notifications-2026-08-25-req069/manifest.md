---
id: CTX-notifications-2026-08-25-req069
type: improvement
feature: notifications
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ069
related: [PLAN096, TP123, TR122]
---

# notifications — Delivery analytics (2026-08-25)

One of an 8-slice backend batch. Closes `REQ025`'s own `US-NOT-05`:
`NotificationSendLog` now records every attempted external send (success
or failure, with the provider's error message), and a new
`notificationDeliveryAnalytics` query aggregates by event type/channel/
status. The daily frequency cap now correctly counts only successful
sends against a recipient's quota.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ069 | [Delivery analytics](../../requirements/notifications/improvement/REQ069-notifications-2026-08-25-delivery-analytics.md) |
| implementation-plans | PLAN096 | [implementation plan](../../implementation-plans/notifications/improvement/PLAN096-notifications-2026-08-25-delivery-analytics.md) |
| test-plans | TP123 | [test plan](../../test-plans/notifications/improvement/TP123-notifications-2026-08-25-delivery-analytics.md) |
| test-results | TR122 | [results](../../test-results/notifications/improvement/TR122-notifications-2026-08-25-delivery-analytics.md) |

## Live verification

`notificationDeliveryAnalytics` queried live, correctly empty (no dev
org has an external provider configured) — the aggregation logic is
exercised directly and thoroughly by the unit suite.
