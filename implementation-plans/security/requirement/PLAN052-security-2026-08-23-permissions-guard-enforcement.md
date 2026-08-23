---
id: PLAN052
type: requirement
feature: security
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ049
related: [PLAN021]
---

# PLAN052 — Implementation plan: PermissionsGuard enforcement

## Files touched

- `backend/src/common/decorators/permissions.decorator.ts` (new)
- `backend/src/common/guards/permissions.guard.ts` (new)
- `backend/src/common/guards/permissions.guard.spec.ts` (new)
- `backend/src/auth/strategies/jwt.strategy.ts` (`permissions` field)
- `backend/src/auth/auth.service.ts` (`resolvePermissions`, `issueTokens` widened)
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/app.module.ts` (guard chain registration)
- `backend/src/users/users.resolver.ts` (`deleteRole` gated, proof application)
- `backend/prisma/seed.ts` (`RolePermissions` seeded for admin/super_admin)

No schema migration — `Permissions`/`RolePermissions`/`UserRoles` were all
already live tables; this slice is pure application-layer wiring plus seed
data.

## Design decisions

1. **JWT-embedded permissions, not a live per-request Redis/DB lookup.**
   The earlier scoping pass for this slice sketched "Redis-cached"; reading
   the real code first showed `roles`/`client_org_id`/`patient_id`/
   `clinician_id` are *all* already resolved once at login and embedded in
   the JWT, never re-fetched per request. Matching that existing,
   already-proven pattern (Hard Rule: "codebase wins on convention") is
   simpler than introducing a new caching layer with its own invalidation
   design, for the same staleness trade-off the codebase already accepts
   elsewhere.
2. **Seeding `RolePermissions` for admin/super_admin was mandatory, not
   optional polish.** Checked before writing the guard: `RolePermissions`
   had zero rows. A `PermissionsGuard` enforced against an empty grants
   table would reject every caller on any gated mutation, including the
   demo admin account — breaking a real feature while "fixing" it. Granting
   the full permission set to the two roles that already have unrestricted
   access via `@Auth()` role gates preserves current behavior exactly,
   rather than inventing a new access policy.
3. **`manager` deliberately left with zero seeded permissions.** Tempting
   to seed a "reasonable" subset, but which of 60 permissions a manager
   should hold is a real business decision this slice's job (wiring the
   enforcement mechanism) shouldn't make unilaterally. Verified this has
   zero effect on current behavior: the only mutation gated so far
   (`deleteRole`) was already `admin`/`super_admin`-only.
4. **`deleteRole` chosen as the one proof-of-concept application**, not a
   broader rollout. It's a real, already-`@Auth()`-gated, destructive
   mutation whose resource (`roles`) has a real, already-seeded permission
   (`roles.delete`) — a clean, low-blast-radius place to prove the second
   independent check actually runs, without touching the dozens of other
   mutations a full RBAC-enforcement sweep would eventually need.
5. **Same rejection message as `RolesGuard`.** Doesn't leak to a probing
   caller whether they failed the role check or the permission check, or
   that a permission system exists at all — matches this codebase's
   existing information-hygiene convention (e.g. `register()`'s identical
   generic conflict message for an existing email).

## Verification

- `npx jest permissions.guard roles.guard auth.service users.resolver users.service --maxWorkers=2` — 100/100 pass.
- `npx jest --maxWorkers=2` (full backend suite) — 755/755 pass; the one
  failing suite (`appointment-payments-reconciliation.service.spec.ts`,
  missing `@nestjs/schedule` type declarations) is a pre-existing,
  unrelated environment gap (confirmed: the package is listed in
  `package.json` but not installed in this host's `node_modules`) — not
  caused by, or fixed in, this slice.
- `npx tsc --noEmit` — 0 new errors (same 2 pre-existing errors as every
  other slice this session).
- `npx eslint src/common/guards src/common/decorators src/auth src/users prisma/seed.ts src/app.module.ts` — 0 errors, 0 warnings.
- Ran the real `seed.ts` against `postgres_test` end to end (not mocked) —
  completed cleanly alongside every other slice's seed additions this
  session (`SubscriptionPlans`, drug master, etc.). A follow-up direct
  query confirmed: `admin`'s `UserRoles` row has exactly 60
  `RolePermissions` rows (matching the full catalog), `staff`'s has 0.
