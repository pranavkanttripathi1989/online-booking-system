---
id: PLAN071
type: requirement
feature: security
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ015
related: [REQ049]
---

# PLAN071 — Implementation plan: clinician verification + org-scoped API keys

## Scope

`US-SEC-07` (clinician verification badge, admin-attested interim path)
and `US-SEC-08` (API key issuance/list/revoke, scoped down — no
per-operation scoping model yet). Explicitly NOT built: `US-SEC-09`
(SSO/SAML/OIDC) — needs a real external identity-provider integration,
out of scope for an additive, isolated pass. `REQ049` (custom-role
enforcement, this requirement's other major story) was already shipped in
an earlier session.

## Design

`Clinicians` already had `registration_number` (added by `REQ021` for
prescription letterheads) — confirmed via schema read before designing,
saving a field. Added `medical_council` (free text — no council master
table yet), `verification_status` (`unverified|pending|verified|rejected`,
default `unverified`), `verified_at`, `verified_by_user_id`.
`updateClinicianVerification` is an admin-attested interim path, not real
HPR/NMC API verification, which the requirement doc explicitly defers —
gated `admin, super_admin` only (not `manager`), a deliberate narrower
gate than most of this session's other domains: verification is an
identity-trust decision, a step above ordinary roster management a
branch manager handles day to day.

`ApiKeys` (client_org_id, key_prefix — shown for identification,
key_hash — bcrypt at the same `BCRYPT_COST` as passwords, never the raw
key stored). `create()` generates a 32-byte random key, returns
`{prefix}.{rawKey}` exactly once via a dedicated
`CreateApiKeyResultType` (the list/read type omits it entirely — the same
"shown once" convention as a webhook secret or TOTP backup code).
`verify(rawKeyWithPrefix)` narrows candidates by prefix (bcrypt hashes
aren't directly comparable) then `bcrypt.compare`s each — reads
`is_active` fresh on every call, never cached, satisfying `US-SEC-08`'s
own "stops working within one request cycle" acceptance criterion by
construction. Not wired to any guard in this slice — no public API exists
yet to authenticate into (see `REQ030`) — kept for a future slice so this
issuance/storage work isn't wasted schema.

## A real finding, corrected before it shipped

Both `webhooks` and `api-keys` were initially gated `@Auth('admin',
'super_admin')` only. Writing this domain's own unit tests surfaced that
`isPlatformOperator()` (`common/scoping/tenant-scope.ts`) treats every
`admin`/`super_admin` caller as platform-wide unconditionally — gating an
org-scoped mutation to admin-only roles makes its own `isSameOrg()`
cross-tenant check unreachable dead code. Fixed by widening both
resolvers to include `manager`. See `TR097` for the full account,
identical to `TR095`'s.

## Files touched

- `backend/prisma/schema.prisma` — `Clinicians` gains `medical_council`,
  `verification_status`, `verified_at`, `verified_by_user_id`; new
  `ApiKeys` model.
- `backend/src/clinicians/{clinicians.resolver.ts,clinicians.service.ts,entities/clinician.entity.ts}` —
  `updateClinicianVerification` mutation + `updateVerification` service method.
- `backend/src/api-keys/` (new module) — `module/resolver/service`,
  `dto/api-key.input.ts`, `entities/api-key.entity.ts`.
- No frontend UI in this slice — a "Verified" badge on the public
  clinician profile and an org-settings "API Keys" tab are both real,
  tested GraphQL surfaces without a consuming page yet, deliberately
  deferred and logged as open.

## GraphQL contract

`updateClinicianVerification(id, status)` — `admin, super_admin`.
`apiKeys`, `createApiKey`, `revokeApiKey` — `manager, admin, super_admin`.

## Test plan

See `TP098`.

## Test results

See `TR097`.
