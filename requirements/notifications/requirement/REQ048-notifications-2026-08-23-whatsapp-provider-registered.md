---
id: REQ048
type: requirement
feature: notifications
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ025
related: [REQ008]
---

# REQ048 — WhatsApp provider registered, credentials encrypted at rest

First vertical slice of `REQ025` (WhatsApp sender identity and credit
wallet). Targets the credential-storage half of US-NOT-01 — the
channel-priority-fallback half depends on trigger-dispatch ordering logic
not built yet, and is separate, larger scope.

## Why this slice

The phase-planning guidance for this session flagged `REQ025` as the
highest-ROI item in the whole PRD-gap audit: *"should ship first and early
in Phase 2 — highest ROI, zero dependencies, and the provider registry
already exists."* Checking that claim against the real code (`REQ008`'s
`backend/src/notifications/providers/`) confirmed it precisely:
`NotificationProviderConfig.channel` is already a plain, un-enum'd `String`
column, every service/resolver method already takes `channel: string`
generically, and `provider.interface.ts`'s own top-of-file comment already
says *"Adding provider #5 means adding one file here and registering it in
registry.ts — no schema change, no resolver change."* This slice is exactly
that: provider #5.

## What was built

- `backend/src/notifications/providers/gupshup-whatsapp.provider.ts` — a
  new provider implementing Gupshup's real, documented WhatsApp Business
  API (`https://api.gupshup.io/wa/api/v1/msg`), distinct from
  `gupshup.provider.ts`'s existing SMS "Enterprise SMS" API — different
  product, different endpoint, different credential shape (API key +
  WhatsApp source number + registered app name), so a separate registry
  entry rather than a channel switch inside the existing one.
- `NotificationProvider.channel` widened from the literal `'sms'` to
  `'sms' | 'whatsapp'` — the only type-level change this required.
- Registered as `gupshup_whatsapp` in `registry.ts`.
- Credential storage, encryption (`common/crypto/secrets.ts`'s existing
  AES-256-GCM), and the "keep existing secret if resubmitted blank"
  behavior all work unchanged — `notification-provider-config.service.ts`
  was never touched, because it was already generic across every provider
  id/channel before this slice existed.
- 9 new/updated unit tests: 5 registered providers (was 4), the new
  provider's field validation, and its `send()` success/HTTP-failure/
  API-rejection/network-failure paths — matching the exact test shape
  already used for `gupshup`/`msg91`/`twilio`/`aws_sns`.

## What this does not do

- No channel-priority-fallback logic (the other half of US-NOT-01) — that
  depends on `notification-trigger.service.ts`'s dispatch-ordering, which
  doesn't yet have a concept of "try WhatsApp, fall back to SMS."
- No credit-wallet tracking (WhatsApp's per-conversation billing model) —
  `REQ025`'s own separate, larger user story.
- No frontend changes — `admin/Communications.jsx`'s provider picker
  already renders from `notificationProviders()`'s real, live list
  generically (per its own `NotificationProviderOptionType.channel` field,
  already queryable); it will pick up `gupshup_whatsapp` automatically
  once/if that page filters or labels by channel, which is a frontend
  slice this backend-only change deliberately doesn't reach into.
