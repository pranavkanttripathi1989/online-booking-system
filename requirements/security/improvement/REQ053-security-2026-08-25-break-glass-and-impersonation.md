---
id: REQ053
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: REQ015
related: [REQ015]
---

# Break-glass emergency access + support impersonation audit trail

## Source

`REQ015`'s own "Deliberately NOT built" note (identity-platform extensions
— break-glass access and formal impersonation grants, `FR-AUTH-06`), left
open when `REQ015`'s clinician-verification + API-keys slice shipped
2026-08-24.

## User stories (as documented in REQ015)

**US-SEC-05** — As a clinician covering an unfamiliar patient in an
emergency, I want to access a record outside my normal scope with a
mandatory reason, so that care isn't blocked by an access boundary, while
the org is alerted.

- PRD ref: §8.1 "Break-glass"
- Priority: P1
- Acceptance criteria: given a clinician requests break-glass access, when
  they provide a reason, then access is granted for a time-boxed window
  (default 30 minutes) and an alert is raised to the Org Admin immediately;
  given the window expires, access reverts automatically.

**US-SEC-06** — As a Support Agent, I want to request time-boxed
impersonation of a tenant user with the org's approval, so that I can
debug an issue without standing access to their data.

- PRD ref: `FR-AUTH-06`
- Priority: P0
- Acceptance criteria: given an impersonation grant is approved, when the
  Support Agent acts, then every mutation is tagged `impersonated: true`
  in the audit log with both the agent's and the target user's identity;
  given the grant is not approved (or has expired), impersonation is
  refused, and a Support Agent's default role cannot read clinical notes
  even while impersonating.

## Scope correction, made before design — read before assuming full parity

Both stories as PRD-written assume governance concepts that don't exist
anywhere in this codebase yet: US-SEC-06 names a "Support Agent" persona
with an org-approval workflow (someone requests, the org approves, then
the agent acts) — this system's real role set is `admin, super_admin,
manager, clinician, staff, patient` (`backend/prisma/seed.ts`'s `ROLES`
array), with no such role or approval-queue concept. Building the full
persona + approval workflow is materially larger than an additive slice —
it needs its own role, its own request/approve UI and mutations, and a
decision on who "the org" is for approval purposes (a `manager`? every
`admin`?). **Scoped down for this slice**: `admin`/`super_admin` can
directly start/end a time-boxed impersonation session against a user in
their own org, with a mandatory reason — the mechanical core (time-boxing,
audit tagging with both identities, automatic expiry) is real and fully
built; the Support-Agent-role + org-approval-queue governance layer is
explicitly deferred, not silently dropped (see Out of scope).

Similarly, US-SEC-05's "access outside my normal scope" implies threading
a break-glass check into every existing self-scoping helper across
`patients`/`encounters`/`test-results` (a large, cross-cutting change
touching many call sites, the same risk category CLAUDE.md's own note on
`REQ032`'s entitlement guard warns about). **Scoped down**: the grant
itself (request, time-box, immediate org-admin alert, automatic expiry) is
built and fully tested this slice; wiring it into each specific
resource-access check is deferred as its own follow-on integration slice
per domain, so a mistake there doesn't silently over- or under-gate every
domain at once.

## Data-model impact

- `BreakGlassGrants` (client_org_id, grantee_user_id, reason, granted_at,
  expires_at, revoked_at?). `requestBreakGlassAccess(reason)` — any
  authenticated clinician/staff — creates a grant expiring in 30 minutes
  (org-configurable in a later slice; fixed default here) and fires an
  immediate notification to the org's admin/manager via the existing
  `NotificationTriggerService` (`REQ008`), not a batch report.
- `ImpersonationSessions` (client_org_id, real_actor_user_id,
  target_user_id, reason, started_at, expires_at, ended_at?).
  `startImpersonation(target_user_id, reason)` (`admin`/`super_admin`
  only, target must be in the caller's own org) mints a fresh JWT via
  `AuthService.issueTokens()` reuse — `sub` set to the target's identity
  (so every existing role/self-scoping check naturally evaluates as the
  target, exactly as impersonation requires) plus new
  `impersonating_user_id`/`real_actor_id` claims. The JWT's own `expiresIn`
  is set to the grant's time-box, giving automatic reversion for free —
  no separate expiry sweep needed. `endImpersonation()` ends it early.
- `AuditLogInterceptor` updated: logs `user_id` as the real actor
  (`user.real_actor_id ?? user.sub`) during an impersonated session, not
  the impersonated identity, plus a new nullable `acting_as_user_id`
  column recording the target — satisfying "tagged... with both the
  agent's and the target user's identity" without a schema rewrite.

## Out of scope (deferred, not silently dropped)

A dedicated `support_agent` role and an org-approval queue for
impersonation requests (US-SEC-06's full governance shape). Enforcing "a
Support Agent's default role cannot read clinical notes even while
impersonating" — moot without that role existing yet. Wiring the
break-glass grant into specific resource-access checks
(patients/encounters/test-results self-scoping) — the grant lifecycle
itself is real; per-domain enforcement is each its own follow-on slice.
SSO/SAML/OIDC (`US-SEC-09`) — needs a real external IdP, correctly
excluded from this entire batch per its own "no new vendor" selection
criterion.
