---
id: REQ114
type: improvement
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: —
related: [PLAN154, TP174, TR174]
---

# REQ114 — Wire OTP-login SMS to the real per-org provider registry

## Why this slice

`auth.service.ts#requestOtp` (the phone-based OTP login path) still
`console.log`s the code instead of sending it — a hardcoded stub,
confirmed live at `auth.service.ts:483`. This has been flagged
repeatedly across this session's own history without ever being fixed
(most recently `REQ109`'s own "related gap found, not fixed here"
note). Meanwhile `REQ008` built a real, already-tested per-org
provider registry (`NotificationProviderConfigService
#getActiveConfigForOrg`), already consumed by
`NotificationTriggerService#sendSms`/`#sendWhatsapp` for event
notifications and by `REQ109`'s own prescription-share OTP. Anyone
attempting a real phone-OTP login today never receives a code at all
outside of reading the server console — this is a genuine,
user-facing broken feature, not a cosmetic gap.

## User story

As a patient/staff user with a registered phone number logging in via
OTP, I want to actually receive my 6-digit code by SMS, so I can
complete login without server-console access.

## Acceptance criteria

- **Given** a registered phone number's `UserProfiles` row has a
  `client_org_id` with an active SMS provider configured, **when**
  `requestOtp` is called, **then** the code is sent via that org's
  real, configured SMS provider (the same `getActiveConfigForOrg`/
  `provider.send()` call shape `sendSms` already uses) — not logged to
  the console.
- **Given** an unregistered phone number, **when** `requestOtp` is
  called, **then** the response is identical to the registered case
  (`{success: true}`) — the existing anti-enumeration guarantee
  (TC-AUTH-API-011) is unchanged.
- **Given** a registered phone number whose org has no SMS provider
  configured (or whose profile has no org at all — a platform
  operator), **when** `requestOtp` is called, **then** the request
  still returns `{success: true}` (never a different response shape or
  error) and the send is skipped, matching `sendSms`'s own existing
  "no phone or org, skip, don't fail the caller" convention.
- **Given** a provider `.send()` call itself fails (network error, bad
  credentials), **when** `requestOtp` is called, **then** the caller
  still sees `{success: true}` — a delivery failure must never leak
  through the response and must never break the anti-enumeration
  guarantee either.

## Scope

- Replace `requestOtp`'s `console.log` stub with a real
  `providerConfigService.getActiveConfigForOrg(profile.client_org_id,
  'sms')` + `config.provider.send(...)` call, reusing the exact
  pattern already proven in `notification-trigger.service.ts#sendSms`
  and `prescriptions.service.ts#sharePrescriptionViaWhatsapp`.

## Deliberately out of scope

- Writing to `NotificationSendLog` (`REQ069`) — that table is keyed by
  `NotificationEventType`, an event-notification concept with its own
  preference/quiet-hours machinery login OTP must never be subject to
  (a login code cannot be deferred by quiet hours). Adding a login-OTP
  member to that enum for logging purposes alone is a separate,
  unrelated schema change this slice does not need.
- `verifyOtp`'s own logic — already correct and unaffected; only the
  send side of `requestOtp` changes.
- Any change to the password-based `login()` flow, TOTP, or the
  separate prescription-share OTP (`REQ109`) — each already has its
  own real send path.
- A genuinely org-less account (no `UserProfiles.client_org_id` at
  all) receiving OTP-login SMS at all — there is no provider to
  resolve without an org, matching every other per-org-provider
  notification path in this codebase. Password-based login remains
  the primary path for such accounts (e.g. the seeded demo
  `admin@medibook.dev`).
