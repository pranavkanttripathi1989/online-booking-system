---
feature: notifications
date: 2026-08-21
ids: [REQ008, PLAN017, TP046, TR045]
status: done
---

# notifications — 2026-08-21

Closes two related open questions found while building `REQ005`/`PLAN010`: `context/open-questions.md` #5 (`NotificationPreferences` were real and persisted, but nothing read them and dispatched anything) and #6 (`admin/Communications.jsx`'s SMS tab offered a Twilio/Vonage picker + raw API key, contradicting what was at the time a fixed-MSG91-vendor rule).

Mid-session, the user gave an explicit architectural redirect: rather than a single fixed SMS vendor, build a generic, provider-agnostic OTP/notification configuration where an admin/manager picks from multiple supported providers (MSG91, Gupshup, Twilio, AWS SNS) and enters that provider's own credential shape via an admin settings screen, encrypted at rest. CLAUDE.md's Hard Rule 9 was revised in place to record this as the one deliberate per-org-configurable exception to the otherwise-fixed India vendor list.

Built: a pluggable provider registry (one file per vendor, each declaring its own credential fields and a `send()` that never throws), `NotificationProviderConfig` (encrypted credentials, AES-256-GCM), and a `NotificationTriggerService.dispatch()` wired into the 4 real domain events with a natural hook (new appointment, appointment cancelled, new message, payment received). `appointment_reminder` (needs a scheduler), `new_review` (`ReviewsService` has no creation path to hook into), and `system_announcement` (no admin broadcast UI) remain deliberately unwired. A real backend validation bug was found and fixed during live verification: `UpdateNotificationProviderConfigInput`/`CredentialFieldInput` had no class-validator decorators, so the global `ValidationPipe`'s whitelist silently stripped every property and every save failed with a generic error.

## Requirement

- [REQ008 — Notification configuration: multi-provider OTP/SMS + trigger pipeline](../../requirements/notifications/requirement/REQ008-notifications-2026-08-21-trigger-pipeline-and-sms-config.md) — done

## Implementation plan

- [PLAN017 — multi-provider OTP config + notification-trigger pipeline](../../implementation-plans/notifications/requirement/PLAN017-notifications-2026-08-21-trigger-pipeline-and-sms-config.md) — done

## Test plan

- [TP046 — Multi-provider OTP/SMS config + notification trigger pipeline](../../test-plans/notifications/requirement/TP046-notifications-2026-08-21-trigger-pipeline-and-sms-config.md) — approved

## Test results

- [TR045 — Multi-provider OTP/SMS config + notification trigger pipeline](../../test-results/notifications/requirement/TR045-notifications-2026-08-21-trigger-pipeline-and-sms-config.md) — passed

## Related

- [settings — 2026-08-20 bundle](../settings-2026-08-20/manifest.md) — the notification-preferences storage this pipeline reads from was built there (PLAN010).
