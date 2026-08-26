---
id: CTX-security-2026-08-23-req049
type: requirement
feature: security
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ049
related: [REQ015, REQ012, PLAN052, TP079, TR078]
---

# security — REQ049, PermissionsGuard enforcement (2026-08-23)

First vertical slice of `REQ015`. Closes `project-plans/analysis/02-findings-register.md`'s
headline finding: the custom Roles/Permissions system had nothing that
ever read it back.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ049 | [PermissionsGuard enforcement](../../requirements/security/requirement/REQ049-security-2026-08-23-permissions-guard-enforcement.md) |
| implementation-plans | PLAN052 | [implementation](../../implementation-plans/security/requirement/PLAN052-security-2026-08-23-permissions-guard-enforcement.md) |
| test-plans | TP079 | [test plan](../../test-plans/security/requirement/TP079-security-2026-08-23-permissions-guard-enforcement.md) |
| test-results | TR078 | [results](../../test-results/security/requirement/TR078-security-2026-08-23-permissions-guard-enforcement.md) |
| test-suggestions | — | skipped — a second guard mirroring `RolesGuard`'s exact, already-proven shape |

## What this closes

`REQ015`'s US-SEC-02. Audit logging of permission checks (`US-SEC-01`),
role-cloning/permission-matrix UI, and a broader `@RequirePermission()`
rollout beyond the one proof mutation (`deleteRole`) remain unbuilt.

## Real finding made while building this (not assumed)

Confirmed directly, before writing any code: `RolePermissions` (the join
table `updateRolePermissions` writes to) had **zero rows** despite the
mutation existing and being callable. Enforcing a guard against an empty
grants table would have locked every account out of every gated mutation
— seeding `RolePermissions` for `admin`/`super_admin` (matching, not
expanding, their existing `@Auth()`-gated access) was a required part of
this slice, not optional cleanup.

## Notable scope decision

`manager` was deliberately left with zero seeded permissions — which of
60 permissions a manager should hold is a real product decision, not
something to invent while wiring the enforcement mechanism. Verified this
has no effect on current behavior since the only currently-gated mutation
(`deleteRole`) was already admin/super_admin-only.

## Blast-radius note

This is the only one of this session's five slices that modifies the
global `APP_GUARD` chain, affecting every resolver in the app. The full
backend unit suite (755/755, excluding one pre-existing unrelated
`@nestjs/schedule` compile failure) was run as regression evidence, not
just this slice's own new tests.
