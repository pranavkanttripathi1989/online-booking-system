---
id: REQ116
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ015
related: [PLAN156, TP176, TR176]
---

# REQ116 — Enforce issued API keys with a real guard

## Why this slice

`REQ015` (`US-SEC-08`) shipped org-scoped `ApiKeys` — issuance, bcrypt
hashing, revocation, and a `verify()` method — but its own documentation
was explicit that nothing consumed it: *"not wired to any guard yet in
this slice (no public API exists to authenticate into), kept for a
future slice that adds one."* `project-plans/analysis/11-next-10-slice-batch.md`
picked this future slice up: a real `ApiKeyGuard` plus one real REST
endpoint gated by it, so an issued key actually does something instead
of only existing in a settings table.

Investigated `ApiKeys`' real schema before scoping: the requirement
doc's own data-model section listed an intended `scopes[]` column, but
it was never migrated — every key today is org-wide, not
operation-scoped. Building a fine-grained per-operation scopes model is
a separate, larger slice (new column + migration + admin UI); this
slice enforces the org-scoping that already exists for real, and notes
the scopes gap explicitly rather than silently assuming it's covered.

## User story

As a partner integration holding an issued MediBook API key, I can call
a real REST endpoint with that key in an `X-API-Key` header and receive
data scoped to exactly the organization that issued it — and a revoked
or invalid key is rejected immediately, with no caching of stale
validity.

## Acceptance criteria

- **Given** a request to `GET /api/v1/appointments` with no `X-API-Key`
  header, **then** it is rejected `401` before any database query runs.
- **Given** an invalid or revoked key, **then** it is rejected `401` —
  `verify()` reads `is_active` fresh on every call, matching `US-SEC-08`'s
  own "stops working within one request cycle" acceptance criterion.
- **Given** a valid key issued by org A, **then** the endpoint returns
  only org A's appointments — the org id comes from the verified key,
  never a request parameter (Hard Rule 6's "scope from the authenticated
  identity, not caller input" rule, applied to a non-JWT identity).
- **Given** a successful call, **then** `last_used_at` is updated on the
  key (already implemented in `verify()`, exercised for the first time
  by a real caller).

## In scope

- `ApiKeyGuard` (`backend/src/api-keys/api-key.guard.ts`).
- `GET /api/v1/appointments` (`PublicApiController`), a minimal
  read-only endpoint (no patient PHI — id, time, duration, status,
  service name, clinician name only) as the first real consumer.

## Deliberately out of scope

- A per-key `scopes[]` permission model — `ApiKeys` has no such column
  today; this slice enforces org-scoping only, the same single-scope
  boundary the key's own issuance already implies.
- Rate-limiting the public API separately from the existing
  `GqlThrottlerGuard` (that guard only instruments GraphQL operations,
  per its own doc comment) — a real gap, logged for a future slice, not
  silently assumed covered here.
- Any write endpoint — read-only is a smaller, safer first real
  consumer.
