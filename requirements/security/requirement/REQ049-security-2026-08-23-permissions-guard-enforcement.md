---
id: REQ049
type: requirement
feature: security
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ015
related: [REQ012]
---

# REQ049 — A real PermissionsGuard enforcing the stored role/permission rows

First vertical slice of `REQ015` (identity platform extensions). Targets
US-SEC-02, the smallest atomic piece of the "make RBAC real" epic (no
audit-logging or role-cloning UI attached, unlike US-SEC-01).

## Why this slice

`project-plans/analysis/02-findings-register.md`'s headline finding: the custom
Roles/Permissions system this codebase's RBAC competitive-gap work built
(`Permissions`, `RolePermissions`, `UserRoles.client_org_id` for per-org
custom roles, `updateRolePermissions` mutation for assigning them) had
**nothing that ever read it back**. Confirmed directly before writing any
code: `RolesGuard` only ever checks `user.roles?.includes(role)` against
the static string baked into `@Roles()`/`@Auth()` — it has never queried
either table. `updateRolePermissions` already existed and already let an
admin assign specific permissions to a role; nothing downstream cared.

## What was built

- `common/decorators/permissions.decorator.ts` — `@RequirePermission(...)`,
  same `SetMetadata` shape as `@Roles()`.
- `common/guards/permissions.guard.ts` — `PermissionsGuard`, same
  fail-open-when-undeclared shape as `RolesGuard`: a resolver with no
  `@RequirePermission()` is completely unaffected. When declared, checks
  `user.permissions` (OR semantics, matching `@Roles()`'s own convention)
  and rejects with the same generic `ForbiddenException` message
  `RolesGuard` uses — doesn't reveal that a permission system exists to a
  caller probing for one.
- Wired into the global guard chain (`app.module.ts`) immediately after
  `RolesGuard`: `GqlThrottlerGuard → GqlAuthGuard → RolesGuard →
  PermissionsGuard → IpWhitelistGuard`.
- `JwtPayload.permissions: string[]` — resolved **once, at token-issuance
  time** (`auth.service.ts`'s new `resolvePermissions(roleId)`, called from
  `issueTokens()`), not re-queried per request. Matches this codebase's
  existing pattern for `roles`/`client_org_id`/`patient_id`/`clinician_id`
  — all embedded at login, none re-fetched live — rather than introducing
  a new per-request DB/Redis round-trip design.
- `seed.ts` gained real `RolePermissions` rows: `admin`/`super_admin` get
  every one of the 60 already-seeded permissions. This was a **necessary**
  part of the slice, not an extra — `RolePermissions` had never been
  seeded either, so enforcing the guard against an empty table would have
  locked every demo account out of every permission-gated mutation.
  Granting admin/super_admin the full set doesn't add a new capability —
  both roles already reach every mutation these permissions gate via their
  existing `@Auth('admin','super_admin')` role checks — it makes the
  permission system's output match the access those roles already have.
- `deleteRole` (`users.resolver.ts`) gated with `@RequirePermission
  ('roles.delete')`, alongside its existing `@Auth('admin','super_admin')`
  — the proof-of-concept application the AC calls for: two independent
  checks now guard this mutation, not one.
- 9 new/changed unit tests: `PermissionsGuard`'s full behavior (mirroring
  `roles.guard.spec.ts`'s exact test shape), `resolvePermissions`'
  join-and-embed behavior in `auth.service.spec.ts`, plus a live run of the
  updated seed script against a real Postgres confirming `admin` receives
  all 60 permissions and `staff` receives zero.

## What this does not do

- **`manager` gets no seeded permissions.** Deciding which of the 60
  permissions a manager should hold is a genuine product/business decision
  (Hard Rule 10) — not something to invent while wiring the enforcement
  mechanism itself. Every mutation `PermissionsGuard` currently gates
  (just `deleteRole`) is already `@Auth('admin','super_admin')`-only, so
  this has no effect on manager's actual access today.
- **No audit logging of permission checks or denials** — that's
  `US-SEC-01`'s scope, a separate, larger slice.
- **No role-cloning/permission-matrix admin UI** — `admin/Roles.jsx`
  remains 100% `mocks/store.js`-driven (per `CLAUDE.md`'s own note); this
  slice is backend enforcement only.
- **Only one mutation gated.** Rolling `@RequirePermission()` out across
  every resource/action pair this session's Permissions catalog defines is
  a large, its-own-review-needed sweep, not something to do silently
  inside a guard-infrastructure slice.
- **A permission change doesn't take effect until the caller's next
  login/token refresh** — same staleness window `client_org_id`/`roles`
  already have in this codebase; not a new limitation this slice
  introduces.
