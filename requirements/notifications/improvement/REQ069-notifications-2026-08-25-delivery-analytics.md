---
id: REQ069
type: improvement
feature: notifications
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ025
related: []
---

# REQ069 — Notification delivery analytics

## Source

Part of an 8-slice batch, scoped from `REQ025`'s own `US-NOT-05` —
"as an org admin, I want to see how many notifications succeeded or
failed, broken down by event type and channel, so I can tell whether a
misconfigured provider is silently failing." `REQ025`'s earlier pass
(same day) shipped WhatsApp-first dispatch, quiet hours, and the daily
frequency cap; delivery visibility was explicitly deferred.

## Current-state gap

`NotificationSendLog` recorded nothing — `notification-trigger.service.ts`
attempted external sends and logged only via the application `Logger`
(container stdout), invisible to any admin UI or query. There was no way
to tell "is WhatsApp actually delivering for this org" without reading
container logs.

## What shipped

`NotificationSendLog` extended: `status String @default('sent')`,
`error_message String?`, `client_org_id String?` (denormalized from the
recipient at write time, since a send log has no other org-scoping
path). `logSendAttempt()` (renamed/replaced from the old
`logExternalSend`) now writes a row for **every** attempted external
send — success or failure — not just successes, with the provider's own
`error` message on a failed attempt. `underDailyFrequencyCap()` now
filters `status: 'sent'` only, so a failed attempt (which never reached
the recipient) doesn't spend their daily quota.

New `notificationDeliveryAnalytics` query (manager+), backed by
`NotificationSendLog.groupBy(['event_type', 'channel', 'status'])`,
org-scoped (or unscoped for a platform operator).

## User stories

- As an org admin, I can see a breakdown of sent vs. failed external
  notifications by event type and channel, to spot a broken provider
  before a patient complains.

## Acceptance criteria (Given/When/Then)

- **Given** a failed SMS send, **when** `notificationDeliveryAnalytics`
  is queried, **then** it appears with `status: 'failed'` and the
  provider's error message was recorded (not just logged to stdout).
- **Given** a recipient who has already had 10 successful sends today and
  1 failed one, **when** an 11th send is attempted, **then** it is
  still permitted — only successful sends count against the cap.
- **Given** a caller from a different org, **then** their analytics never
  include another org's rows.

## Traceability

`REQ025` `US-NOT-05`. `FR-NOT-06` (PRD).
