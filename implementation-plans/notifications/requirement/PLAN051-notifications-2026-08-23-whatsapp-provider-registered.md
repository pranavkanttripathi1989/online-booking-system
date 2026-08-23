---
id: PLAN051
type: requirement
feature: notifications
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ048
related: [PLAN017]
---

# PLAN051 — Implementation plan: WhatsApp provider registered

## Files touched

- `backend/src/notifications/providers/gupshup-whatsapp.provider.ts` (new)
- `backend/src/notifications/providers/provider.interface.ts` (widen `channel` type)
- `backend/src/notifications/providers/registry.ts` (register the new provider)
- `backend/src/notifications/providers/registry.spec.ts`
- `backend/src/notifications/notification-provider-config.service.spec.ts`

No migration, no resolver change, no entity change — see `REQ048`'s "why
this slice" for why the existing registry design already made this true
before writing any code, not just in hindsight.

## Design decisions

1. **A separate `gupshup_whatsapp` provider, not a `channel` parameter
   inside the existing `gupshup` SMS provider.** Gupshup's WhatsApp
   Business API and its Enterprise SMS API are different products with
   different endpoints, auth headers, and credential shapes (API key +
   header auth vs. user_id/password query params) — sharing one file would
   mean a provider whose `fields`/`send()` behavior branches on an implicit
   channel flag, which is exactly the kind of hidden coupling the
   one-file-per-provider convention exists to avoid.
2. **Only `channel`'s type widened, nothing else.** Checked
   `NotificationProviderConfig.channel` in `schema.prisma` before touching
   any code — it's a plain `String` column, and every consuming
   service/resolver method already takes `channel: string`, not a
   TypeScript union or GraphQL enum. The interface's `'sms'` literal was
   the only place a real change was needed.
3. **Real, documented API endpoint, not a placeholder.** Matches
   `msg91.provider.ts`/`gupshup.provider.ts`'s own precedent (real
   endpoints, honest "no real credentials to test delivery against yet"
   caveat) rather than inventing a fictitious contract that would need
   rewriting the moment real sandbox credentials arrive.

## Verification

- `npx jest notifications --maxWorkers=2` — 51/51 pass across all 5
  notifications-module suites (9 new/changed in `registry.spec.ts` +
  `notification-provider-config.service.spec.ts`).
- `npx tsc --noEmit` — 0 new errors (same 2 pre-existing, unrelated errors
  as every other slice this session).
- `npx eslint src/notifications` — 0 errors, 0 warnings.
