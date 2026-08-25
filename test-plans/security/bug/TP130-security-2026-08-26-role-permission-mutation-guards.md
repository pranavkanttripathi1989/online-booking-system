---
id: TP130
type: bug
feature: security
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN103
related: [BUG026]
---

# TP130 — Test plan for the role/permission mutation guards (F-06)

## `users.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | System role, `updateRolePermissions` | Rejected, no transaction run |
| 2 | Unknown role | `NotFoundException` |
| 3 | Unknown permission id | Rejected, no transaction run |
| 4 | `getAuditLogs`, platform operator | No `user` filter |
| 5 | `getAuditLogs`, org-scoped caller | `where.user` is `{userProfiles: {client_org_id}}` |
| 6 | `getAuditLogs`, org-less non-platform caller | Fail-closed sentinel |

Plus 4 pre-existing `getAuditLogs` shape tests updated for the new
5th argument.

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Real `updateRolePermissions` against the seeded `admin` system role
(rejected), a real custom role with a bad permission id (rejected), a
real custom role with a real permission id (succeeded).
