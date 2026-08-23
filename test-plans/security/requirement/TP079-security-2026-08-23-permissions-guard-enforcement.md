---
id: TP079
type: requirement
feature: security
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ049
related: [PLAN052]
---

# TP079 — Test plan: PermissionsGuard enforcement

Direct test-plan against an already-proven pattern (a second guard mirroring
`RolesGuard`'s exact shape) — suggestion stage skipped per `CLAUDE.md`'s
working loop step 4.

## Unit — `permissions.guard.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | No `@RequirePermission()` on the resolver | Guard runs | Allows through — unaffected, same as an undecorated `@Roles()` case |
| TC-02 | `@RequirePermission()` present, no `req.user` | Guard runs | `ForbiddenException('Not authenticated')` — guard-ordering safety net |
| TC-03 | Caller has an admin-eligible role but lacks the specific required permission | Guard runs | Rejected — **the headline finding this closes**: a role alone is no longer sufficient |
| TC-04 | Caller's JWT has no `permissions` field at all (pre-this-slice token, or a role with zero grants) | Guard runs | Rejected, not silently allowed |
| TC-05 | Caller holds at least one of several listed required permissions | Guard runs | Allowed — OR semantics, matching `@Roles()` |
| TC-06 | Caller holds the exact single required permission | Guard runs | Allowed |

## Unit — `auth.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-07 | A role with real `RolePermissions` rows | `login()` succeeds | `resolvePermissions` queried with the correct `role_id`; the signed JWT payload's `permissions` array matches the resolved permission names |
| TC-08 | A role with zero `RolePermissions` rows | `login()` succeeds | JWT's `permissions` is `[]`, not `undefined` and not every permission |

## Regression

| Case | Given | When | Then |
|---|---|---|---|
| TC-09 | Every pre-existing spec in `auth.service.spec.ts`, `users.resolver.spec.ts`, `users.service.spec.ts`, `roles.guard.spec.ts` | Suite run | Still green |
| TC-10 | The full backend unit suite | `npx jest --maxWorkers=2` | Green except the one pre-existing, unrelated `@nestjs/schedule`-missing-module failure |

## Live (real database)

| Case | Given | When | Then |
|---|---|---|---|
| TC-11 | The updated `seed.ts`, run against `postgres_test` (not mocked) | Seed completes | `admin`'s `UserRoles` row has exactly 60 `RolePermissions` rows; `staff`'s has 0 |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-12 | `npx tsc --noEmit` | No new errors |
| TC-13 | `npx eslint src/common/guards src/common/decorators src/auth src/users prisma/seed.ts src/app.module.ts` | 0 errors, 0 new warnings |

## Deliberately not covered

No integration/e2e test driving `deleteRole` through the real guard chain
end-to-end via a live GraphQL call — the guard's decision logic is fully
covered at the unit level (`TC-01`-`TC-06`), and the JWT-embedding path is
covered by `TC-07`/`TC-08`; a full HTTP-level round trip would mostly be
re-proving NestJS's own `APP_GUARD` ordering, already covered by this
codebase's existing `gql-auth.guard.spec.ts`/`roles.guard.spec.ts`
precedent of unit-testing guards in isolation rather than end-to-end.
