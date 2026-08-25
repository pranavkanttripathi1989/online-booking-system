---
id: BUG026
type: bug
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# BUG026 — `updateRolePermissions` could strip a system role's permissions; `permissionIds` unvalidated; `getAuditLogs` unscoped

## Source

`project-plans/02-findings-register.md` F-06, part of the same
10-finding pick-up as `BUG024`/`BUG025`. Re-verified still open: neither
`updateRolePermissions` nor `getAuditLogs` had changed since the finding
was written, though `F-03` (the sibling finding in the same section) had
since been closed by `REQ049`'s real `PermissionsGuard`.

## The bugs, precisely

1. `updateRole`/`deleteRole` both guard `existing.is_system` (a
   `ConflictException` if the target is a system role like `admin`).
   `updateRolePermissions` — the third Role-CRUD mutation, the one that
   actually rewrites a role's granted permissions — had **no such
   guard**, so it could silently strip every permission from `admin`
   itself via this one path.
2. `permissionIds` was passed straight to `rolePermissions.createMany`
   with no existence check — a bad id surfaced as a raw Prisma
   foreign-key constraint error instead of a clean rejection.
3. `getAuditLogs` had no org scoping at all. Currently
   `admin`/`super_admin`-only (both platform-wide by this codebase's own
   `isPlatformOperator()` design), so not live-exploitable today — but a
   future widening of the `@Auth` gate to a real org-scoped role (e.g.
   `manager`, the exact class of mistake `CLAUDE.md` already documents
   for `webhooks`/`api-keys`) would leak every tenant's audit trail with
   no code change needed to the query itself.

## Fix

`updateRolePermissions` now fetches the target role first, rejects a
missing/soft-deleted role (`NotFoundException`) or a system role
(`ConflictException`, same message shape as `updateRole`/`deleteRole`),
and validates every `permissionId` against `Permissions` before writing
(`BadRequestException` if any id doesn't exist). `getAuditLogs` now
scopes via `isPlatformOperator(user) ? {} : {user: {userProfiles:
{client_org_id: user.client_org_id ?? '__no_org__'}}}` — a two-hop
relation filter, since `AuditLogs` has no `client_org_id` of its own and
`Users` is a thin identity table (the real org lives on `UserProfiles`).

`updateUser`/`updateRole`/`deleteRole` were deliberately **not** given a
`@CurrentUser()` param with no accompanying scoping logic — the
original finding's "thread @CurrentUser() through all five" was
audited case by case: these three have no use for the caller's identity
today (all admin/super_admin-only, no org-scoping need), and the global
`AuditLogInterceptor` already captures caller identity for every
mutation independent of resolver signature. Adding an unused parameter
would have been decoration, not a fix.

## Acceptance criteria (Given/When/Then)

- **Given** a system role (e.g. `admin`), **when** its permissions are
  changed via `updateRolePermissions`, **then** the mutation is
  rejected and no write happens.
- **Given** an unknown permission id, **then** the mutation is rejected
  before any write, with a clean error.
- **Given** a non-platform caller (hypothetically gated on this query in
  the future), **then** `getAuditLogs` scopes to their own org via the
  two-hop `user.userProfiles.client_org_id` relation.

## Traceability

`project-plans/02-findings-register.md` F-06.
