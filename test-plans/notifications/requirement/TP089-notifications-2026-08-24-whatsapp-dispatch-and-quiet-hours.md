---
id: TP089
type: requirement
feature: notifications
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ025
related: [PLAN062]
---

# TP089 — Test plan: WhatsApp dispatch fallback + quiet hours/frequency cap

Direct test-plan against an already-proven extension pattern (the
provider-registry/dispatch architecture REQ008/REQ048 already built) —
suggestion stage skipped per `CLAUDE.md`'s working loop step 4.

## Unit — `notification-trigger.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01–TC-11 | All pre-existing `dispatch()` cases | Re-run after the `notificationSendLog` mock addition | Pass unchanged |
| TC-12 | Both WhatsApp and SMS enabled and configured | `dispatch` | WhatsApp tried first, SMS never called, a `NotificationSendLog` row created for `channel: 'whatsapp'` |
| TC-13 | WhatsApp enabled, no WhatsApp provider configured for the org | `dispatch` | Falls back to SMS |
| TC-14 | WhatsApp enabled and configured, provider reports a failed send | `dispatch` | Falls back to SMS |
| TC-15 | WhatsApp disabled in preferences (SMS enabled) | `dispatch` | Sends via SMS directly, `getActiveConfigForOrg` never called with `'whatsapp'` (regression check) |
| TC-16 | Quiet hours `21:00`–`08:00`, current time 23:30 IST | `dispatch` a `new_message` event | External send suppressed |
| TC-17 | Same quiet-hours window, current time 23:30 IST | `dispatch` an `appointment_reminder` event | Still sent — time-critical carve-out |
| TC-18 | Same quiet-hours window, current time 11:30 IST | `dispatch` | Sends normally |
| TC-19 | `isWithinQuietHours` pure function | Same-day window, midnight-wrapping window, degenerate (start===end) window | Each computed correctly (hand-verified IST-offset math) |
| TC-20 | `NotificationSendLog.count` at the cap (10) | `dispatch` | External send skipped; in-app notification still created |
| TC-21 | `NotificationSendLog.count` under the cap (9) | `dispatch` | Sends normally |

## Unit — `notification-preferences.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-22 | Lazy-seed on first read | `myPreferences` | All 7 default rows include the correct `whatsapp_enabled` default (`true` for `new_appointment`/`appointment_reminder`/`payment_received`, `false` elsewhere, mirroring each event's existing `sms_enabled` default) |
| TC-23 | `quiet_hours_start` set without `quiet_hours_end` | `updateMyPreferences` | Rejected, `{success:false}`, no write attempted |
| TC-24 | Both quiet-hours fields set | `updateMyPreferences` | Succeeds, persists `whatsapp_enabled`/`quiet_hours_start`/`quiet_hours_end` |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-25 | `npx prisma validate` | Schema valid |
| TC-26 | `npx tsc --noEmit` | No new errors |
| TC-27 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | 0 errors |
| TC-28 | `npm test` (full suite) | All suites green |
| TC-29 | Frontend `npx eslint src/pages/settings/index.jsx` | 0 errors |

## Live verification against the real dev stack

| Case | Given | When | Then |
|---|---|---|---|
| TC-30 | Real org with `gupshup_whatsapp` registered (from `REQ048`) and an SMS provider both configured | Trigger a real `new_appointment` event (e.g. book a real appointment) | WhatsApp attempted first per the real dispatch logs |
| TC-31 | Settings page, Notifications tab | Toggle the new WhatsApp column and set quiet hours, save | `myNotificationPreferences` round-trips the new fields correctly on reload |
