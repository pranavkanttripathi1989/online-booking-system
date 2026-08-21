---
id: REQ008
type: requirement
feature: notifications
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN017, TP046, TR045]
---

**Closed 2026-08-21** (`PLAN017`, tested `TP046` approved / `TR045` passed): a `NotificationTriggerService.dispatch()` wired into the 4 real domain events with a natural hook (new appointment, appointment cancelled, new message, payment received), plus a pluggable provider registry (MSG91/Gupshup/Twilio/AWS SNS) with per-org encrypted credentials, replacing the disabled Twilio/Vonage placeholder card in `admin/Communications.jsx`. `appointment_reminder` (needs a scheduler), `new_review` (`ReviewsService` has no creation path to hook into), and `system_announcement` (no admin broadcast UI) remain deliberately unwired — see `context/open-questions.md` for the current status of each.

# Notification configuration: multi-provider OTP/SMS + trigger pipeline

**Why this exists:** resolves two related open questions found earlier this session. `context/open-questions.md` #5 — `NotificationPreferences` are real and persisted (`backend/src/notification-preferences`), but `NotificationsService.create()` has zero callers anywhere; nothing in any domain actually reads a user's preferences and dispatches anything when a real event happens. `context/open-questions.md` #6 — `admin/Communications.jsx`'s SMS tab currently offers a Twilio/Vonage picker + raw API-key field, contradicting what was at the time a fixed-MSG91-vendor rule; it's been disabled since `PLAN011` pending a decision.

**Decision (revised 2026-08-21):** OTP/SMS is admin-configurable per org, not a single fixed vendor — each org picks a provider from a supported registry and enters that provider's own credential shape, encrypted at rest. This supersedes the earlier fixed-MSG91-only reading of CLAUDE.md hard rule 9, which has been updated accordingly (OTP/notification-channel providers are now the explicit exception to "vendors are fixed" — every other vendor, Razorpay/Stripe/SES, stays hardcoded). No real credentials for any SMS provider are available in this environment to test an actual delivered message against — a genuine, logged blocker (hard rule 9 still applies to *not fabricating* a delivery). What ships is fully real end-to-end except the final "message actually left the provider's servers" step: a generic, extensible provider registry, encrypted per-org credential storage, and real trigger wiring — the moment real credentials are entered for whichever provider an org picks, sends work with no further code changes.

## Scope

1. **A generic `NotificationProviderConfig` model** — `client_org_id`, `channel` (`sms` today, extensible to `whatsapp` etc. later without a schema change), `provider` (`msg91`|`gupshup`|`twilio`|`aws_sns`, a code-level registry not a hardcoded enum, so adding a provider is a code change not a migration), `credentials_encrypted` (a JSON blob whose shape varies per provider — MSG91 needs `{authkey, sender_id}`, Twilio needs `{account_sid, auth_token, from_number}`, etc. — encrypted as one unit, never partially exposed), one active config per `(client_org_id, channel)`.
2. **A provider registry** (`backend/src/notifications/providers/`) — each provider declares its id, label, the credential fields it needs (so the frontend can render the right form without hardcoding per-provider UI), and a `send(credentials, {to, message})` implementation. Adding provider #5 later means adding one file to this registry, not touching the schema or the settings resolver.
3. **`admin/Communications.jsx`'s SMS card, rebuilt as "OTP / Notification Provider" configuration** — a provider `<Select>` sourced from the registry, with credential fields rendered dynamically per the selected provider's declared shape. Real `notificationProviderConfig`/`updateNotificationProviderConfig` resolvers, self-scoped, credentials write-only (never round-tripped back to the client once saved, same principle as a session never exposing its raw refresh token).
4. **Notification-trigger wiring** for the 4 event types with a real, existing creation path to hook into: `new_appointment` (`AppointmentsService.create`), `appointment_cancelled` (`AppointmentsService.update`'s cancel transition), `new_message` (`MessagesService.sendMessage`), `payment_received` (`AppointmentPaymentsService.verifyRazorpayPayment`'s success path). Each checks the recipient's `NotificationPreferences` for that event type before doing anything — `app_enabled` creates a real `Notifications` row, `sms_enabled` resolves the org's configured provider (if any) from the registry and attempts a real send (no-ops with a clear log line if none is configured, never silently pretends to send), `email_enabled` stays a clearly-logged stub (no real email vendor credentials exist either — same blocker class, not fabricated).

### Explicitly not built this pass — logged, not guessed at

- **`appointment_reminder`** — needs a scheduled/time-based job (send X before the appointment), not a domain-event hook. This is scheduler infrastructure (BullMQ is already provisioned per `redis/redis.module.ts` but has no jobs registered anywhere yet) — a distinct, larger piece of work.
- **`new_review`** — `ReviewsService` has no creation path at all (confirmed by grep: no `create`/`submit` method exists, no code anywhere calls `prisma.reviews.create`). There is nothing to hook a trigger onto. A real, separate gap, logged in `context/open-questions.md`, not this requirement's to fix.
- **`system_announcement`** — no admin UI or mutation exists to originate one; nothing to trigger from. Flagged as a future admin-broadcast feature.

## Constraints (from CLAUDE.md)

- Money/vendor rules: MSG91/Gupshup fixed, no Twilio/Vonage — this requirement is the fix for the exact violation `context/open-questions.md` #6 flagged.
- Multi-tenancy: SMS credentials are org-scoped (`client_org_id`), self-scoped resolvers, never a client-supplied org id.
- Don't fabricate a vendor integration without real credentials to test against (hard rule 9) — the send path is real code, but its live-delivery claim stays honestly caveated until real credentials exist.

## Acceptance criteria

- A manager can pick any registered SMS provider and enter its credentials via the Communications settings tab; they're stored encrypted, never returned in plaintext by any query.
- Booking an appointment, cancelling one, sending a message, and a successful payment each create a real `Notifications` row for the right recipient(s), gated by that recipient's actual stored preference for that event type — an explicit test proves the gate (preference off → no row created).
- With no SMS credentials configured, an `sms_enabled` event logs clearly and does not throw or silently claim success.
- Cross-tenant isolation: an org's SMS credentials are never readable by another org — explicit rejection test per hard rule 6.
