---
id: PLAN096
type: improvement
feature: notifications
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ069
related: []
---

# PLAN096 — Implementation plan for notification delivery analytics

## Schema

`NotificationSendLog` extended: `status String @default('sent')`,
`error_message String?`, `client_org_id String?`. New composite index
supporting the analytics `groupBy`.

## Changes

**`notification-trigger.service.ts`**: `logSendAttempt(userId,
eventType, channel, status, errorMessage, clientOrgId)` replaces the old
`logExternalSend`. Both `sendWhatsapp()` and `sendSms()` call it on
**both** branches — the existing failure branch (now with `status:
'failed'`, `result.error`) and a new success branch (`status: 'sent'`,
no error). `underDailyFrequencyCap()`'s own count query gained
`status: 'sent'` to the `where` — a failed attempt no longer spends the
recipient's quota, since it never reached them.

**`notifications.service.ts`**: `deliveryAnalytics(user)` —
`notificationSendLog.groupBy({by: ['event_type','channel','status'],
where: isPlatformOperator(user) ? {} : orgScope(user), _count:
{_all:true}})`, flattened to `{event_type, channel, status, count}`.

**`notifications.resolver.ts`**: `notificationDeliveryAnalytics`
(manager+).

## Testing (see `TP123`)

`notification-trigger.service.spec.ts` (pre-existing, extended) — 3 new
cases: the cap query filters `status: 'sent'`, a failed send logs
`status: 'failed'` with the error message, a successful send logs
`status: 'sent'` with no error message. `notifications.service.spec.ts`
extended — 3 new cases: org-scoping, unscoped for a platform operator,
`_count` flattening.

## Live verification

`notificationDeliveryAnalytics` queried against the real dev DB —
correctly returned `[]` (no external sends logged yet in this dev
environment, since no org has a configured SMS/WhatsApp provider). The
non-empty aggregation shape is covered thoroughly by the unit suite,
which exercises `groupBy`'s row-flattening directly.
