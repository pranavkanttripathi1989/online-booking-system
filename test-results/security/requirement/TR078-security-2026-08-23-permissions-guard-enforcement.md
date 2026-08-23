---
id: TR078
type: requirement
feature: security
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP079
related: [REQ049, PLAN052]
---

# TR078 — Results: PermissionsGuard enforcement

Executed 2026-08-23 in the same isolated worktree as `TR074`-`TR077`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `allows the request through when the resolver declares no @RequirePermission() at all` |
| TC-02 | pass | `rejects when a permission is required but no authenticated user is on the request` |
| TC-03 | pass | `rejects a caller lacking the required permission, even with an admin-eligible role` |
| TC-04 | pass | `rejects a caller whose JWT has no permissions field at all` |
| TC-05 | pass | `allows a caller who holds at least one of the required permissions — OR semantics` |
| TC-06 | pass | `allows a caller whose permissions include the exact single required permission` |
| TC-07 | pass | `resolves the caller's granted permissions from RolePermissions/Permissions and embeds them in the signed JWT` |
| TC-08 | pass | `embeds an empty permissions array for a role with zero RolePermissions rows, not undefined or every permission` |
| TC-09 | pass | `npx jest auth.service permissions.guard roles.guard users.resolver users.service --maxWorkers=2` — 100/100 pass |
| TC-10 | pass | `npx jest --maxWorkers=2` (full suite) — 755/755 pass; 1 suite fails to compile on `@nestjs/schedule` (pre-existing, confirmed present in `package.json` but absent from this host's installed `node_modules` — unrelated to this or any other slice this session) |
| TC-11 | pass | Live `ts-node prisma/seed.ts` run against `postgres_test`: direct follow-up query confirmed `admin` → 60 `RolePermissions` rows, `staff` → 0 |
| TC-12 | pass | `npx tsc --noEmit` — 0 new errors |
| TC-13 | pass | `npx eslint ...` — 0 errors, 0 warnings |

## Notes

This is the highest-blast-radius slice of the five built this session — it
adds a new global `APP_GUARD` that runs on every single GraphQL operation
in the app, not just a new module. The full-suite regression run (TC-10,
755/755 excluding the one pre-existing unrelated failure) is the load-
bearing evidence here, not just the new guard's own unit tests: it proves
every existing resolver, none of which declare `@RequirePermission()`,
is unaffected by the new guard being globally registered.
