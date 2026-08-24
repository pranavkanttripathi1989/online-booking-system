---
id: PLAN062
type: requirement
feature: notifications
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ025
related: [REQ048]
---

# PLAN062 — Implementation plan: WhatsApp dispatch fallback + quiet hours/frequency cap

## Scope

Remainder of `US-NOT-01` (channel-priority-fallback dispatch — `REQ048`
already registered the `gupshup_whatsapp` provider itself and its
encrypted-credential storage, but explicitly not this half, per its own
"what this does not do" section) plus `US-NOT-04` (quiet hours, frequency
cap). `US-NOT-02` (sender identity), `US-NOT-03` (credit wallet), and
`US-NOT-05` (delivery analytics) are P1, untouched.

## Design

`notification-trigger.service.ts`'s `dispatch()` had three independent,
unordered boolean-gated branches (app/sms/email) before this slice — no
WhatsApp branch at all, no channel-priority/fallback control flow
(confirmed by reading the file in full before planning). Restructured: if
`whatsapp_enabled`, try WhatsApp first; fall through to SMS only if that
attempt's `result.sent` is false (provider not configured for the org, or
configured but the send failed) — never when WhatsApp is simply disabled
in preferences, which skips straight to SMS as before (regression-tested).

Quiet hours: `"HH:MM"` strings on `NotificationPreferences`, matching
`ClinicianAvailability`'s own existing string time-of-day convention. No
per-user timezone exists anywhere in this schema — quiet hours are
computed against a fixed IST offset (Asia/Kolkata is this entire
India-market product's standing default timezone per `CLAUDE.md`), a
deliberate, documented simplification rather than a new one silently
introduced. `appointment_reminder` and any `priority: 'high'` payload
bypass quiet hours, per `US-NOT-04`'s own "except genuinely time-critical
events" carve-out — chosen over threading real appointment-timing data
through every one of the 4 existing call sites' payloads.

Frequency cap: new minimal `NotificationSendLog` table (one row per actual
external send — WhatsApp or SMS, not the non-disruptive in-app
notification), a named `MAX_EXTERNAL_SENDS_PER_DAY = 10` constant, checked
before attempting any external send. Recipient-level, not per-channel,
matching the requirement's own "no more than N messages to one recipient
per day" wording.

## Files touched

- `backend/prisma/schema.prisma` — `NotificationPreferences` gains
  `whatsapp_enabled`/`quiet_hours_start`/`quiet_hours_end`; new
  `NotificationSendLog` table.
- `backend/prisma/migrations/20260824060000_notifications_whatsapp_dispatch_and_quiet_hours/`
  (new, hand-written).
- `backend/src/notifications/notification-trigger.service.ts` — full
  rewrite of `dispatch()`'s channel logic; new `sendWhatsapp()`,
  `isWithinQuietHours()` (public, for direct unit coverage of the
  wraps-midnight logic), `underDailyFrequencyCap()`, `logExternalSend()`.
- `backend/src/notifications/notification-trigger.service.spec.ts` —
  `prisma` mock gains `notificationSendLog` (defaulted to "0 sent today",
  preserving every pre-existing test unchanged); new describe blocks for
  WhatsApp-first/fallback, quiet hours (including the pure-function
  wraps-midnight cases), and the frequency cap.
- `backend/src/notification-preferences/{dto/notification-preference.input.ts,
  entities/notification-preference.entity.ts,notification-preferences.service.ts,
  notification-preferences.service.spec.ts}` — `whatsapp_enabled` mirrors
  the existing three-flag pattern exactly; `quiet_hours_start`/`end` are
  validated both-or-neither at the DTO layer (`@Matches` HH:MM regex) and
  rejected both-or-neither again at the service layer before any write.
  Confirmed via grep that these `DEFAULTS` maps are independently
  duplicated between this service and the trigger service (not shared from
  one source) — updated both, left the duplication itself alone as a
  separate, unrelated refactor.
- `frontend/src/pages/settings/index.jsx` — `MY_NOTIFICATION_PREFERENCES_QUERY`/
  `handleSaveNotifications` gain the new fields; the notification-preferences
  table's channel toggle was already generic (`${channel}_enabled`, mapped
  over `['email','sms','app']`) so adding `'whatsapp'` to that array was a
  data-only change, no new toggle-rendering logic; new "Quiet Hours" panel
  (two `TextField type="time"` + Clear button) — one account-wide window,
  not per-event-type, matching the requirement's own framing.

## Test plan

See `TP089`.

## Test results

Deferred to the end-of-pass consolidated verification run across all five
slices — see `TR088` once that run completes.
