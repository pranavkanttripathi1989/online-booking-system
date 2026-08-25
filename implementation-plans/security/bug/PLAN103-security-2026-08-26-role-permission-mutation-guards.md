---
id: PLAN103
type: bug
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: BUG026
related: []
---

# PLAN103 — Implementation plan for the role/permission mutation guards (F-06)

No schema change. All changes in `backend/src/users/`.

## Changes

**`users.service.ts#updateRolePermissions`**: fetches
`prisma.userRoles.findUnique({where:{id: roleId}})` first; `NotFound` if
missing/deleted, `Conflict` if `is_system`. If `permissionIds.length`,
`prisma.permissions.count({where:{id:{in: permissionIds}}})` must equal
`permissionIds.length` or `BadRequestException`. The existing
`$transaction`(delete+recreate) body is unchanged, just gated behind
these two checks now.

**`users.service.ts#getAuditLogs`**: gained a `user: JwtPayload` param;
`where` gains `...(isPlatformOperator(user) ? {} : {user: {userProfiles:
{client_org_id: user.client_org_id ?? '__no_org__'}}})`. New import:
`isPlatformOperator` (already imported `orgIdForWrite`/`orgScope` from
the same module).

**`users.resolver.ts#getAuditLogs`**: threads `@CurrentUser()`.

## Testing (see `TP130`)

`users.service.spec.ts` extended — 5 new cases: system-role rejection on
`updateRolePermissions`, unknown-role rejection, unknown-permission-id
rejection, `getAuditLogs` org-scoping for a platform operator vs. a
regular org-scoped caller vs. an org-less non-platform caller (fail-closed
sentinel). All 4 pre-existing `getAuditLogs` tests updated to pass the
new 5th `user` argument (`platformUser`, preserving their original
intent — they test row-shaping, not scoping).

## Live verification

`updateRolePermissions` on the real seeded `admin` system role —
rejected with "System roles cannot have their permissions changed",
confirmed via direct DB check the role's permission set was untouched.
Same mutation with a real non-system role and a nonexistent permission
id — rejected with "One or more permission ids do not exist". Same
mutation with a real permission id — succeeded.
