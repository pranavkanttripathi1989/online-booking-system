---
id: PLAN076
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ053
related: [REQ015]
---

# PLAN076 — Implementation plan: break-glass access + impersonation audit trail

## Scope

`REQ053` (`US-SEC-05`/`US-SEC-06`, `REQ015`'s own deferred identity-platform
extensions) — a scoped-down build of both: the break-glass grant lifecycle
(request, immediate org-admin alert, auto-expiry) and admin/super_admin
impersonation with real audit attribution. See `REQ053`'s own "Scope
correction, made before design" section for exactly what was descoped from
the PRD's fuller Support-Agent/org-approval governance shape and why.

## Design

**Impersonation** — minted at token-issuance time, not via a new guard
(the approach the exploration pass recommended): `JwtPayload` gained an
optional `real_actor_id`. `AuthService.startImpersonation(actor,
targetUserId, reason)` looks up the target's `UserProfiles` row, validates
org membership via the existing `isSameOrg()` helper, creates an
`ImpersonationSessions` row, and signs a fresh access token with `sub` set
to the **target's** identity (so every existing role/self-scoping check
naturally evaluates as the target — exactly what impersonation requires)
plus `real_actor_id` set to the real actor's. The token's own `expiresIn`
is set to the 30-minute time-box, giving automatic reversion for free — no
separate expiry sweep needed. `endImpersonation()` marks the session
`ended_at` for audit purposes; the token itself remains technically valid
until its own expiry, matching this codebase's existing access-token
revocation model (short-lived tokens aren't blocklisted anywhere else
either — only refresh tokens are, via Redis, at logout).

`AuditLogInterceptor` now reads `user.real_actor_id ?? user.sub` for
`user_id` (so every write during an impersonation session is attributed
to the real actor) and writes the impersonated identity to a new nullable
`AuditLogs.acting_as_user_id` column — satisfying "tagged with both the
agent's and the target user's identity" without a schema rewrite. A
non-impersonating caller (the overwhelming majority) is byte-for-byte
unaffected: `real_actor_id` absent, `acting_as_user_id` stays null.

**Break-glass** — new top-level `backend/src/break-glass/` module
(scaffolded like `checklist`/`intake-fields`). `requestBreakGlassAccess`
is self-service (any `clinician`/`staff`/`manager`/`admin`/`super_admin`),
immediately grants a 30-minute `BreakGlassGrants` row, and alerts every
`admin`/`manager` in the grantee's org via the real
`NotificationTriggerService.dispatch()` pipeline (`type: 'alert', priority:
'high'`) — a real in-app notification, not a batch report, satisfying the
acceptance criterion. `revokeBreakGlassAccess` lets a manager/admin end a
grant early. `hasActiveGrant(userId)` is built but **not** exposed via
GraphQL or wired into any resource-access check — see the requirement
doc's own deferred-scope note on why per-domain integration is its own
follow-on slice.

## A real, documented pitfall re-discovered — and fixed at the test, not the code

The first draft of the "rejects impersonating a user in a different org"
test used an `admin`-role actor and asserted rejection — and failed,
because `isSameOrg()` (via `isPlatformOperator()`) treats every
`admin`/`super_admin` caller as platform-wide **unconditionally**,
regardless of their own `client_org_id` — a documented, intentional design
(CLAUDE.md: "only admin/super_admin are platform-wide by design"). Since
`startImpersonation` is `@Auth('admin', 'super_admin')`-gated, the
cross-org check is genuinely unreachable for the only roles that can call
it — the exact "isSameOrg()'s check can never actually reject anyone"
trap CLAUDE.md's own Phase G+2 account describes for `webhooks`/`api-keys`.
Unlike that prior fix (which widened the gate to include `manager`),
here the **correct** behavior actually is "a platform-wide admin can
impersonate any org's user" — that's the intended support-debugging use
case, not a bug. Fixed by rewriting the test to assert the real, intended
behavior (cross-org impersonation succeeds for a platform-wide actor) and
adding a second test with a hypothetical org-scoped actor role, proving
`isSameOrg()`'s check is real and would reject correctly if this gate is
ever widened — not dead code left in by accident.

## Testing

`auth.service.spec.ts` — 8 new cases: blank reason rejected, nonexistent
target rejected, self-impersonation rejected, org-less pair rejected
(neither has an org to anchor to), a platform-wide admin correctly CAN
impersonate cross-org, a hypothetical org-scoped actor correctly cannot,
token minted with the right `sub`/`real_actor_id`/`expiresIn`,
`endImpersonation` no-ops for a non-impersonating caller and marks the
active session ended otherwise.

`audit-log.interceptor.spec.ts` — 2 new cases: impersonation session
attributes `user_id` to the real actor and records `acting_as_user_id`;
a normal caller is unaffected. (Two test-authoring bugs caught and fixed
before these ran clean: both new tests initially forgot to mock
`clientOrganizations.findUnique` — the interceptor short-circuits and
never writes when that lookup resolves `undefined`, an easy trap the
file's own pre-existing tests already show the pattern for.)

`break-glass.service.spec.ts` (new, 11 cases): org-less caller rejected,
grant expires in ~30 minutes, every admin/manager in the org alerted
immediately (not batched), `myGrants` self-scoped, `is_active` computed
correctly from expiry/revocation, `revoke` rejects cross-org and
already-revoked grants, `hasActiveGrant` true/false paths.

`break-glass` added to `matrix-coverage.int-spec.ts`'s `EXEMPT` list
(self-scoped by `grantee_user_id`, not org — same shape as the existing
`notifications` exemption); `auth` was already exempt.

Full suite: backend unit — 77/77 suites, 1116/1116 tests (was 76/1096
after `REQ052`). `npm run test:int` (from host) — 4/4 suites, 333/333
tests (unchanged from `REQ052` — no new `CASES` row, `break-glass` is
`EXEMPT` not covered). `eslint`/`tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped — see `REQ053` for the full account)

A `support_agent` role + org-approval queue for impersonation requests.
Enforcing "cannot read clinical notes even while impersonating" (moot
without that role). Wiring break-glass grants into specific resource-
access checks per domain. SSO/SAML/OIDC. Frontend UI (backend-only, per
this batch's confirmed direction).
