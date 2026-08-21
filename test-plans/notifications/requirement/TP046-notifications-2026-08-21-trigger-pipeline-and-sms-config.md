---
id: TP046
type: requirement
feature: notifications
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ008
related: [PLAN017]
---

# Test plan — Multi-provider OTP/SMS config + notification trigger pipeline (REQ008/PLAN017)

## Unit tests

`backend/src/notifications/providers/registry.spec.ts` (new): lists all 4 registered providers, each declaring the `sms` channel; `getProvider` resolves a known id and returns `undefined` for an unknown one; `validateCredentials` flags a missing required field by its human label and passes when every required field is present (optional fields may be omitted), for every provider's own declared shape; each provider's `send()` reports a caught (never thrown) failure on a non-ok HTTP response / a non-success response body / a rejected request, and reports success on an ok response — msg91/gupshup/twilio mocked via `global.fetch`, aws_sns mocked via `jest.mock('@aws-sdk/client-sns')`.

`backend/src/notifications/notification-provider-config.service.spec.ts` (new): `providers()` lists the catalog without auth; `myProviderConfig` is scoped to the caller's own `client_org_id` (never a client-supplied org) and returns `null` outright for an org-less caller rather than leaking every org's config; reports `has_credentials` true/false correctly and never returns decrypted credentials; `updateMyProviderConfig` rejects an org-less caller, an unknown provider id, and a missing required credential field; encrypts credentials at rest (verified the raw plaintext never appears in the Prisma write, and round-trips via `decrypt`); an empty credentials payload keeps the existing stored secret rather than wiping it, but is rejected for a genuinely new (never-configured) provider; `getActiveConfigForOrg` (internal) returns `null` for no row or an explicitly deactivated one, and decrypts correctly for an active one.

`backend/src/notifications/notification-trigger.service.spec.ts` (new): creates an in-app notification using the same `DEFAULTS` shape as `notification-preferences.service.ts` when no preferences row exists; honors a saved preferences row over the defaults, including disabling app notifications entirely; queries preferences scoped to the exact `user_id`+`event_type` composite key; skips SMS (without throwing) when the user has no phone or no org-configured provider; sends via the org's configured provider when everything is in place; never throws when the provider reports a failed send; does not touch SMS/provider lookups when only `email_enabled` is set (email is a log-only stub in this environment).

`backend/src/appointments/appointments.service.spec.ts`, `messages/messages.service.spec.ts`, `appointment-payments/appointment-payments.service.spec.ts` (extended): each dispatches the correct event type to the correct linked profile on success, and does not dispatch when there's no linked profile / on a failed operation.

## Live e2e verification (real backend, Playwright/Chromium)

1. As `manager@medibook.dev` (org-scoped — `client_org_id` present in the JWT): selected MSG91 from the real `notificationProviders` registry query, entered real-shaped credentials, saved via `updateMyNotificationProviderConfig`, confirmed the row landed correctly in `NotificationProviderConfig` (provider/sender_id/`is_active` in the clear, `credentials_encrypted` as opaque ciphertext) via direct `psql` inspection.
2. As `admin@medibook.dev` (platform-wide — `client_org_id: null`): confirmed the same save is correctly rejected ("Your account isn't associated with an organization"), proving the org-less-caller guard actually fires rather than just existing in code.
3. Reload confirms persistence: provider selected, sender name shown, a "Credentials configured" chip, and the credential fields themselves correctly blank (never re-sent to the client).
4. Required-field validation: submitting Twilio with only Account SID filled (Auth Token/From Number blank) is rejected with "Missing required field" rather than silently succeeding.

Found and fixed a real backend validation bug during this pass (see `TR045` for detail): `UpdateNotificationProviderConfigInput`/`CredentialFieldInput` had `@Field()` but no class-validator decorators, so the global `ValidationPipe`'s `whitelist: true` silently stripped every property including nested array items, and every save failed with a generic "Bad Request Exception" giving no indication why.

## Browser e2e (Playwright)

`frontend/e2e/admin-communications-sms-provider.spec.js` (new): provider selection + dynamic credential fields + save + reload-persistence as Manager; required-field-missing rejection. Serialized (`test.describe.configure({mode:'serial'})`) since both tests write to the same org's single `NotificationProviderConfig` row.

## Responsive check

360px/768px/1280px: `admin/Communications.jsx`'s "OTP / SMS Provider" card — zero horizontal overflow, dynamic credential fields and the configured-chip render correctly at every breakpoint.
