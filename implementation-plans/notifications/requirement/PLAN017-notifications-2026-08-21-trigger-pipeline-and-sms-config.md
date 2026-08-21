---
id: PLAN017
type: requirement
feature: notifications
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ008
related: [TP046, TR045]
---

# Implementation plan — multi-provider OTP config + notification-trigger pipeline (REQ008)

## Schema

New model, not columns bolted onto `ClientOrganizations` — the credential shape varies per provider and doesn't belong flattened into the org's own row:

```
model NotificationProviderConfig {
  id                    String   @id @default(uuid())
  client_org_id         String
  channel               String   // 'sms' today; extensible ('whatsapp', ...) with zero schema change
  provider              String   // registry key, e.g. 'msg91' | 'gupshup' | 'twilio' | 'aws_sns'
  credentials_encrypted String   // AES-256-GCM JSON blob, shape owned by the provider's registry entry
  sender_id             String?  // common display field across most SMS providers; kept denormalized
  is_active             Boolean  @default(true)
  created_at            DateTime @default(now())
  updated_at            DateTime @default(now())

  client_org ClientOrganizations @relation(fields: [client_org_id], references: [id])

  @@unique([client_org_id, channel])
}
```

`UserProfiles`: `totp_secret_encrypted String?`, `totp_enabled Boolean @default(false)`, `totp_backup_codes Json?` (shared migration with `PLAN016` Slice C — both need the encryption helper built here first).

## `backend/src/common/crypto/secrets.ts`

`encrypt(plaintext: string): string` / `decrypt(ciphertext: string): string`, AES-256-GCM, key from `process.env.SETTINGS_ENCRYPTION_KEY` (32-byte hex, generated for `.env`/`.env.example` — not a vendor credential, safe to create). IV prepended to the ciphertext so decrypt is self-contained. Throws clearly if the env var is missing — a misconfigured deployment fails loudly, never silently stores plaintext.

## `backend/src/notifications/providers/` — the registry

One file per provider, each exporting `{id, label, channel, fields: [{key, label, type: 'text'|'password', required}], send(credentials, {to, message}): Promise<{sent: boolean, error?: string}>}`:

- `msg91.provider.ts` — fields `authkey`, `sender_id`; real MSG91 v5 flow-API send shape.
- `gupshup.provider.ts` — fields `user_id`, `password`, `sender_id`.
- `twilio.provider.ts` — fields `account_sid`, `auth_token`, `from_number`.
- `aws-sns.provider.ts` — fields `access_key_id`, `secret_access_key`, `region`.

`registry.ts` exports `PROVIDERS: Record<string, Provider>` and `getProvider(id)`. Every `send()` implementation catches its own errors and returns `{sent: false, error}` — a failed/misconfigured SMS must never throw into (and break) the appointment/message/payment flow that triggered it.

## `backend/src/notifications/notification-provider-config.service.ts` (new)

`myProviderConfig(channel, user)` — returns `{channel, provider, sender_id, has_credentials: boolean}`, never the decrypted blob. `updateMyProviderConfig(channel, provider, credentials, sender_id, user)` — validates `credentials` has exactly the registry's declared required fields for that provider, encrypts, upserts on `(client_org_id, channel)`.

## `admin/Communications.jsx`'s SMS card → "OTP / Notification Provider"

Provider `<Select>` populated from a `notificationProviders` query (returns the registry's `{id, label, fields}` list, so the frontend never hardcodes per-provider form shape). Selecting a provider renders its declared fields dynamically. Existing credentials never pre-fill (write-only) — a "credentials configured" chip shows instead, with a "replace" affordance.

## `backend/src/notifications/notification-trigger.service.ts` (new)

`async dispatch(userId, eventType, payload: {title, message, type, priority?, action_url?})`:
1. Look up the user's `NotificationPreferences` row for `eventType` (falls back to `notification-preferences.service.ts`'s existing `DEFAULTS` map for a user who's never visited the tab).
2. `app_enabled` → `NotificationsService.create(...)`.
3. `sms_enabled` → resolve the user's org, look up its active `NotificationProviderConfig` for `channel: 'sms'`; if none, log `[notification] SMS skipped for user <id> — no SMS provider configured for org <id>` and continue; if present, decrypt credentials and call the registry provider's `send()`. Never throws.
4. `email_enabled` → logs `[notification] EMAIL stub — would send "<title>" to <userId> (no AWS SES credentials configured in this environment)`. Matches the existing OTP-stub logging convention in `auth.service.ts` exactly.

## Wiring into the 4 real trigger points

- `appointments.service.ts`'s `create()`: after the transaction, resolve the clinician's linked `UserProfiles` row (`clinician_id` match) and dispatch `new_appointment` if one exists (unlinked clinician → skip, same as every other unlinked-account handling in this codebase).
- `appointments.service.ts`'s `update()`: on a status transition to `cancelled`, dispatch `appointment_cancelled` to both the clinician's and patient's linked profiles (if any).
- `messages.service.ts`'s `sendMessage()`: dispatch `new_message` to each `otherParticipants` entry, alongside the existing `pubSub.publish` loop.
- `appointment-payments.service.ts`'s `verifyRazorpayPayment()`: on `status: 'succeeded'`, dispatch `payment_received` to the patient's linked profile.

## Testing

`notification-trigger.service.spec.ts`: dispatch respects each preference flag independently; SMS attempt with no provider configured logs and doesn't throw; email always logs the stub. `registry.spec.ts`: each provider's `send()` returns `{sent:false}` (not a thrown error) on a failed HTTP call. `notification-provider-config.service.spec.ts`: credentials round-trip encrypted, `myProviderConfig` never returns the raw blob, cross-org rejection, rejects credentials missing a provider-required field. Each of the 4 call-site services gets a new test proving the dispatch fires only on the real transition.

## Verification

Full backend `npm test` green. Live check: create a real appointment as a linked clinician account, confirm a real `Notifications` row via the `notifications` query. Commit.
