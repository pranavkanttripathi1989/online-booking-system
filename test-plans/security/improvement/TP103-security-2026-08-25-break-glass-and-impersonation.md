---
id: TP103
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN076
related: [REQ053]
---

# TP103 — Test plan: break-glass access + impersonation audit trail

Skipping the test-suggestion stage per CLAUDE.md's conditional rule for
`break-glass` (routine config-table CRUD matching `checklist`'s proven
pattern), but this touches shared auth infrastructure — reviewed directly
against `REQ053`'s own scope-correction notes rather than treated as
purely routine.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `startImpersonation` — blank reason | Rejected |
| 2 | `startImpersonation` — nonexistent target | Rejected |
| 3 | `startImpersonation` — target and actor both org-less | Rejected (no tenant to anchor the session to) |
| 4 | `startImpersonation` — self-impersonation | Rejected |
| 5 | `startImpersonation` — platform-wide admin, target in a different org | **Succeeds** (intentional — matches `isPlatformOperator` design) |
| 6 | `startImpersonation` — hypothetical org-scoped actor, target in a different org | Rejected |
| 7 | `startImpersonation` — token contents | `sub` = target, `real_actor_id` = actor, `expiresIn` = 1800s |
| 8 | `endImpersonation` — non-impersonating caller | No-op, `{success:false}` |
| 9 | `endImpersonation` — active session | Marked `ended_at` |
| 10 | Audit log — impersonating caller | `user_id` = real actor, `acting_as_user_id` = impersonated identity |
| 11 | Audit log — normal caller | `user_id` = own sub, `acting_as_user_id` absent |
| 12 | `requestBreakGlassAccess` — org-less caller | Rejected |
| 13 | `requestBreakGlassAccess` — grant duration | ~30 minutes |
| 14 | `requestBreakGlassAccess` — alert dispatch | Every admin/manager in the grantee's org, immediately |
| 15 | `myBreakGlassGrants` | Scoped to the caller's own grants only |
| 16 | `is_active` computation | True only when not revoked and not expired |
| 17 | `revokeBreakGlassAccess` — cross-org | Rejected |
| 18 | `revokeBreakGlassAccess` — already revoked | Rejected |
| 19 | `revokeBreakGlassAccess` — in-scope, active | Succeeds |
| 20 | `hasActiveGrant` | True/false correctly for active vs. expired/revoked/absent |

## Out of scope

Support-Agent role + org-approval workflow, clinical-notes role ceiling
during impersonation, per-domain break-glass integration, SSO, frontend UI
(backend-only per this batch's confirmed direction).
