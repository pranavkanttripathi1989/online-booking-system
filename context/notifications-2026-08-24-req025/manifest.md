---
id: CTX-notifications-2026-08-24-req025
type: requirement
feature: notifications
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ025
related: [REQ048, PLAN062, TP089, TR088]
---

# notifications — REQ025 slice: WhatsApp dispatch fallback + quiet hours/frequency cap (2026-08-24)

Third of five PRD-derived requirement slices picked and built in one pass
(REQ014 → REQ029 → **REQ025** → REQ016 → REQ023). Completes the remainder
of `US-NOT-01` that `REQ048` (2026-08-23) explicitly deferred — provider
registration was done, dispatch-ordering was not.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ025 | [WhatsApp as a first-class channel, sender identity, and message credit wallet](../../requirements/notifications/requirement/REQ025-notifications-2026-08-22-whatsapp-sender-identity-and-credit-wallet.md) |
| implementation-plans | PLAN062 | [WhatsApp dispatch fallback + quiet hours/frequency cap](../../implementation-plans/notifications/requirement/PLAN062-notifications-2026-08-24-whatsapp-dispatch-and-quiet-hours.md) |
| test-plans | TP089 | [verification plan](../../test-plans/notifications/requirement/TP089-notifications-2026-08-24-whatsapp-dispatch-and-quiet-hours.md) |
| test-results | TR088 | [verification results — pass](../../test-results/notifications/requirement/TR088-notifications-2026-08-24-whatsapp-dispatch-and-quiet-hours.md) |

## What shipped

- `NotificationTriggerService.dispatch()` — WhatsApp attempted first,
  falling back to SMS only on failure/absent config, matching the PRD's
  own channel priority.
- Quiet hours (`"HH:MM"`, IST-implicit — documented simplification, no
  per-user timezone exists yet) with a time-critical carve-out
  (`appointment_reminder`, `priority: 'high'`).
- A daily frequency cap on external sends (`NotificationSendLog`, new
  table).
- `whatsapp_enabled`/`quiet_hours_start`/`quiet_hours_end` on
  `NotificationPreferences`, wired through the DTO/entity/service and a
  new "Quiet Hours" panel + WhatsApp toggle column on
  `settings/index.jsx`'s Notifications tab.
- Tests: ~19 new/updated unit tests across the trigger service and
  preferences service.

## Real findings from this slice

1. **A math error caught before the suite ever ran**: the first draft of
   the `isWithinQuietHours` pure-function test asserted 15:30 IST was
   "outside" a 09:00–17:00 window — simply wrong, caught by re-deriving
   the UTC→IST conversion by hand rather than trusting the first draft.
2. **A real frontend bug, found via live verification, not unit tests**:
   `settings/index.jsx`'s "Clear" button for quiet hours sent
   `quiet_hours_start: quietHoursStart || undefined` — but the backend's
   partial-update semantics treat an *omitted* field as "leave the stored
   value alone," so the Clear button was a silent no-op against any
   previously-saved quiet hours. Caught while reverting live test data
   (the revert attempt itself didn't work, which is what surfaced it).
   Fixed by sending explicit `null` instead.
3. Confirmed live, understood as an expected one-time migration-backfill
   artifact (not a defect): pre-existing `NotificationPreferences` rows
   all got `whatsapp_enabled: true` from the migration's column default,
   not this slice's more nuanced per-event `DEFAULTS` map (which only
   governs lazy-seeding for a brand-new user).

## What's deliberately not built yet

`US-NOT-02` (sender identity), `US-NOT-03` (credit wallet), `US-NOT-05`
(delivery analytics) — all P1, untouched. No live WhatsApp send was
exercised (no real Business API sandbox credentials in this environment).

## Next in this pass

REQ016 (differentiated pricing by patient category and channel).
