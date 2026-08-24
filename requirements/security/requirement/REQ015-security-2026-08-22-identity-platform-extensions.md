---
id: REQ015
type: requirement
feature: security
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: REQ001
related: [REQ012, REQ001, REQ049, PLAN071, TP098, TR097, REQ053]
---

## Status (2026-08-24)

**`US-SEC-07`/`US-SEC-08` shipped** (`PLAN071`/`TP098`/`TR097`): clinician
verification fields (`medical_council`, `verification_status`,
`verified_at`, `verified_by_user_id` on `Clinicians`) plus an
admin-attested `updateClinicianVerification` mutation — not real HPR/NMC
API verification, which the requirement doc explicitly defers to an
"interim path" for now; org-scoped `ApiKeys` (bcrypt-hashed, same
convention as passwords, shown once at issuance). Custom-role enforcement
(`REQ049`) was already done in an earlier session. See
`context/security-2026-08-24-req015/manifest.md`.

**Deliberately NOT built**: `US-SEC-09` (SSO/SAML/OIDC) — needs a real
external identity-provider integration, explicitly out of scope for this
additive, isolated pass. The issued API keys are also not yet wired to any
guard (no public API exists to authenticate into yet — see `REQ030`) —
`verify()` exists and is unit-tested, but nothing calls it in this slice.

# Identity platform extensions: custom-role enforcement, SSO, clinician verification, API keys

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §8 (RBAC & Permission Model) and §9 **M2 — Identity, Authentication & Security** (`FR-AUTH-01`–`FR-AUTH-07`). Cross-referenced against `project-plans/02-findings-register.md` F-03/F-06 and `project-plans/03-security-and-tenancy-audit.md` §4.

## Current state vs. PRD ambition

Authentication fundamentals are already strong and should not be disturbed: timing-safe login, bcrypt cost 12, Redis-backed lockout, real TOTP 2FA with backup codes, and a correctly-ordered fail-closed guard chain (`GqlThrottlerGuard → GqlAuthGuard → RolesGuard → IpWhitelistGuard`). Patient OTP login exists as a UI affordance but is backed by a hardcoded `MOCK_OTP` in the frontend rather than the real `requestOtp`/`verifyOtp` resolvers — this is `project-plans` F-02 and must be fixed as part of that finding, not re-scoped here.

The PRD's RBAC ambition is materially larger than what exists, and this is the same gap `project-plans` already identified independently as F-03: **`Permissions` and `RolePermissions` are real, populated tables that nothing reads to authorise anything.** `RolesGuard` checks role-name strings only; `hasPermission()` in the frontend always returns `false`. The PRD's permission matrix (Appendix A) — atomic permission strings like `prescription.sign`, scoped assignments across `{platform, organization, branch, department}`, and a break-glass emergency-access path — describes exactly the system this gap prevents from working.

Three items are entirely unbuilt with no existing scaffolding:

1. **SSO** (`FR-AUTH-04`) — no SAML/OIDC integration exists.
2. **Clinician verification against a registry** (`FR-AUTH-05`) — `Clinicians.clinician_type` is a plain string with no council-registration-number field, no HPR linkage, and no verified-badge concept.
3. **Scoped, rotatable API keys / OAuth2 client credentials** (`FR-AUTH-07`) — no API-key infrastructure exists at all; this also blocks `REQ030` (platform integrations).

## Gap classification

- **Extend existing:** RBAC enforcement (the permission-resolution and `PermissionsGuard` work already scoped by `project-plans` F-03); break-glass access as an extension of the existing `AuditLogInterceptor`.
- **Net-new:** SSO, clinician registry verification, API keys/OAuth2, scoped data-access flag (`cross_branch_patient_access`).
- **Already satisfied:** password/OTP/TOTP authentication, lockout, session idle-timeout (already built per-org in `REQ012`), impersonation with audit (`FR-AUTH-06` — `IpWhitelistGuard`'s sibling concept doesn't exist yet for impersonation specifically; see gap below).

One gap not previously flagged: `FR-AUTH-06` (support impersonation requires an org-approved, time-boxed grant, with a visible banner and every action tagged as impersonated) has **no equivalent today** — the codebase has no impersonation feature of any kind. This is worth calling out because it is a common source of the exact "org-less caller sees everything" bug class `project-plans` F-01 found: an impersonation session that doesn't correctly narrow to the target org is a second instance of the same defect.

## Phase assignment

PRD Phase: RBAC enforcement and impersonation are effectively **MVP-adjacent hardening** (the PRD lists `FR-RBAC-01`–`05` without a phase tag, treating them as foundational); SSO is explicitly **V2** (`FR-AUTH-04`, P2); clinician verification and API keys are **V1 GA** (P1). Recommended sequencing: **before** `REQ014`'s Department/Resource entities ship, since every new entity needs correct scope-checking from day one, and RBAC enforcement is the mechanism that makes `{platform, organization, branch, department}` scoping real rather than role-name-only.

## Dependencies

- **Requires:** the shared `orgScope()`/`isPlatformOperator()` helper from `project-plans` F-01 (RBAC scope resolution sits on top of correct org resolution, not instead of it).
- **Blocks:** `REQ031` (insurance) needs the Insurance/TPA Desk Executive role's narrow permission set (`insurance.*` minus `insurance.tariff.manage`) to be expressible, which requires real permission enforcement, not role-name gating.

## User stories

### Epic: Make the permission matrix real

**US-SEC-01** — As an Org Admin, I want to toggle individual permissions on a custom role and have that change immediately restrict what a user with that role can do, so that the permission matrix I edit is not decorative.
- PRD refs: FR-RBAC-01, FR-RBAC-02
- Priority: P0
- Acceptance criteria:
  - Given a custom role with `prescription.sign` unchecked, when a user with only that role attempts to sign a prescription, then the mutation is rejected server-side with `FORBIDDEN`, regardless of what the UI shows.
  - Given the same toggle, when the change is saved, then it is written to the audit log with actor, target role, before/after permission set, and timestamp (`FR-RBAC-03`).
  - This closes `project-plans` F-03 as its primary acceptance test.

**US-SEC-02** — As a system, I want every permission check to run server-side regardless of what the client UI hides, so that a modified or bypassed frontend cannot grant access it shouldn't have.
- PRD refs: FR-RBAC-01
- Priority: P0
- Acceptance criteria:
  - Given the frontend has been tampered with to show a hidden action, when the corresponding mutation is called directly, then the `PermissionsGuard` still rejects it based on the caller's real, server-resolved permission set.

**US-SEC-03** — As an Org Admin, I want to clone a system role into a custom role and adjust individual permissions, so that I can create a "Senior Receptionist" role without engineering involvement.
- PRD refs: FR-RBAC-02
- Priority: P1
- Acceptance criteria:
  - Given the "Front Desk" system role, when I clone it and add `billing.refund` up to a limit, then the new role is org-scoped (not visible to other tenants) and system roles remain unmodified.

**US-SEC-04** — As an Org Admin, I want clinical-note visibility for non-clinical roles to default to OFF, so that a receptionist cannot read consultation notes unless I explicitly enable it.
- PRD refs: FR-RBAC-04
- Priority: P0
- Acceptance criteria:
  - Given a fresh organization, when a Front Desk user queries a patient's encounter, then clinical note content is withheld by default and only demographic/scheduling fields are returned.
  - Given an Org Admin toggles visibility on, then the change is audited and immediately reflected for future queries.

### Epic: Break-glass access

**US-SEC-05** — As a clinician covering an unfamiliar patient in an emergency, I want to access a record outside my normal scope with a mandatory reason, so that care isn't blocked by an access boundary, while the org is alerted.
- PRD refs: §8.1 "Break-glass"
- Priority: P1
- Acceptance criteria:
  - Given a clinician requests break-glass access, when they provide a reason, then access is granted for a time-boxed window (default 30 minutes) and an alert is raised to the Org Admin immediately, not in a batch report.
  - Given the window expires, then access reverts automatically without requiring the clinician to remember to revoke it.

### Epic: Impersonation

**US-SEC-06** — As a Support Agent, I want to request time-boxed impersonation of a tenant user with the org's approval, so that I can debug an issue without standing access to their data.
- PRD refs: FR-AUTH-06
- Priority: P0
- Acceptance criteria:
  - Given an impersonation grant is approved, when the Support Agent acts, then every mutation is tagged `impersonated: true` in the audit log with both the agent's and the target user's identity, and a persistent banner is shown to any concurrent session of the impersonated user.
  - Given the grant is not approved (or has expired), then impersonation is refused, and a Support Agent's default role cannot read clinical notes even while impersonating (per the P1 persona table: "Cannot access clinical notes, export patient data").

### Epic: Clinician verification

**US-SEC-07** — As a patient browsing the booking page, I want to see a verified badge on a clinician's profile, so that I can trust their registration is real.
- PRD refs: FR-AUTH-05
- Priority: P1
- Acceptance criteria:
  - Given a clinician's registration number and council are captured, when validated (against HPR where available, or manually by an Org Admin as an interim path), then a verified badge renders on the public profile.

### Epic: API keys and SSO

**US-SEC-08** — As an Org Admin on an Enterprise plan, I want to issue a scoped, rotatable API key for a partner integration, so that I can grant programmatic access without sharing a user's login.
- PRD refs: FR-AUTH-07
- Priority: P1
- Acceptance criteria:
  - Given a new API key is issued, when it is used, then it is scoped to exactly the operations it was granted and every call is attributable to the key in the audit log.
  - Given a key is revoked, then it stops working within one request cycle with no caching of the old validity.

**US-SEC-09** — As an Enterprise Org Admin, I want staff to log in via our corporate SSO (Google Workspace / Entra / SAML), so that we don't manage a second password system.
- PRD refs: FR-AUTH-04
- Priority: P2
- Acceptance criteria: standard SAML/OIDC assertion validation; a first-login SSO user is provisioned into the org's existing role structure, never auto-granted a role beyond the org's configured default.

## Data model impact

- `Permissions`/`RolePermissions` already exist — no new tables, but the JWT/`me` payload gains a resolved `permissions: string[]` field (Redis-cached per user, invalidated on role change).
- New `BreakGlassGrants` table: `id`, `client_org_id`, `user_id`, `patient_id`, `reason`, `granted_at`, `expires_at`.
- New `ImpersonationGrants` table: `id`, `support_agent_id`, `target_org_id`, `approved_by`, `expires_at`, `revoked_at`.
- `Clinicians` gains `registration_number`, `council`, `hpr_id`, `verified_at`.
- New `ApiKeys` table: `id`, `client_org_id`, `scopes[]`, `key_hash`, `created_by`, `revoked_at`, `last_used_at`.

## Non-functional notes

Permission resolution must not become a query-per-request cost on every mutation (`project-plans` F-15 already flags N+1 risk in this codebase) — cache the resolved set in Redis, invalidate on role/permission change, and measure p95 latency impact against the existing `< 400ms` slot-availability target before shipping broadly.

## Open questions

- PRD §19 does not raise an open question specific to this module, but the interaction between break-glass and DPDP's purpose-limitation principle (`REQ034`) needs a compliance review before GA — logged here for that requirement's author to pick up.
