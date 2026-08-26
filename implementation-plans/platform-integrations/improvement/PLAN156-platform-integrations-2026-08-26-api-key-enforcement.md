---
id: PLAN156
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ116
related: [TP176, TR176]
---

# PLAN156 — Implementation plan: enforce API keys with a real guard

## Change

**`backend/src/api-keys/api-key.guard.ts`** (new) — `ApiKeyGuard
implements CanActivate`. Reads `X-API-Key` from the request, rejects
`UnauthorizedException` if missing; calls
`ApiKeysService#verify()` (already real and tested since REQ015),
rejects if it returns `null`; on success attaches the resolved
`client_org_id` to `req.apiKeyOrgId` for the controller to scope its
query by. Mirrors the "guard resolves identity, service enforces scope"
split `GqlAuthGuard`/`RolesGuard` already use for the JWT path.

**`backend/src/api-keys/api-keys.service.ts`** — new
`listAppointmentsForOrg(orgId, date?)`: scopes strictly by the given
`orgId` (`clinic: {client_org_id: orgId}`), optional `date` filter on
`appointment_time`, returns a minimal shape (no patient PHI — id, start
time, duration, status, service name, clinician name), capped at 200
rows. Updated the stale comment on `verify()` that said "not wired to
any guard yet" — now wired.

**`backend/src/api-keys/public-api.controller.ts`** (new) —
`@Controller('api/v1')`, `GET appointments` gated by `@UseGuards(ApiKeyGuard)`,
optional `?date=` query param. Plain REST, not GraphQL — matches
`documents.controller.ts`'s own precedent for an external-caller
endpoint the two internal GraphQL dialects were never designed for.
Excluded from `matrix-coverage.int-spec.ts` for the same documented
structural reason as `DocumentsController`/`AttachmentsController`/
`OrgBrandingController` (that suite only drives GraphQL operations).

**`backend/src/api-keys/api-keys.module.ts`** — registers
`ApiKeyGuard` as a provider and `PublicApiController` as a controller.

No `schema.prisma` change — `ApiKeys` already has everything this slice
needs (`client_org_id`, `key_hash`, `is_active`).

## Testing

`backend/src/api-keys/api-key.guard.spec.ts` (new): rejects a missing
header before calling `verify()`; rejects an invalid/revoked key;
attaches the resolved org id and activates on a valid key.

`backend/src/api-keys/api-keys.service.spec.ts`: 3 new cases for
`listAppointmentsForOrg` — scopes strictly by the given org id (never a
caller-supplied one), filters by date when provided, returns the
minimal PHI-free shape.

Full backend unit suite: 91/91 suites, 1447/1447 tests (6 new).
Integration suite: 4/4 suites, 387/387 tests unchanged — confirms the
real `AppModule` boots cleanly with the new controller/guard registered
via the existing `ApiKeysModule`. `tsc --noEmit`/`eslint` clean.

## Documentation

`REQ116` (this requirement), `PLAN156` (this plan), `TP176`/`TR176`
(verification), a context bundle, and index updates across all five doc
roots plus the `platform-integrations` feature README.
