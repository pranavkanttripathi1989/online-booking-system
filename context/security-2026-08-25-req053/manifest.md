---
id: CTX-security-2026-08-25-req053
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ053
related: [REQ015, PLAN076, TP103, TR102]
---

# security — REQ053: break-glass access + impersonation audit trail (2026-08-25)

Third slice in the 8-slice batch picked from `project-plans/` this session
(research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ053 | [break-glass + impersonation](../../requirements/security/improvement/REQ053-security-2026-08-25-break-glass-and-impersonation.md) |
| implementation-plans | PLAN076 | [implementation plan](../../implementation-plans/security/improvement/PLAN076-security-2026-08-25-break-glass-and-impersonation.md) |
| test-plans | TP103 | [verification plan](../../test-plans/security/improvement/TP103-security-2026-08-25-break-glass-and-impersonation.md) |
| test-results | TR102 | [verification results — pass, 77/77 + 4/4 suites](../../test-results/security/improvement/TR102-security-2026-08-25-break-glass-and-impersonation.md) |

## Scope correction made before design, not discovered mid-build

`REQ015`'s original stories (`US-SEC-05`/`US-SEC-06`) assume governance
concepts that don't exist in this codebase yet — a "Support Agent" role
with an org-approval queue for impersonation. Scoped down explicitly in
the requirement doc itself, before any code was written: admin/super_admin
can directly start/end a time-boxed impersonation session with a mandatory
reason (the mechanical core — time-boxing, audit tagging, automatic
expiry — is real); the Support-Agent-role + approval-queue governance
layer is deferred. Same treatment for break-glass: the grant lifecycle
(request, alert, expire) is real; wiring it into specific resource-access
checks is a deferred per-domain follow-on, matching the risk-category
caution CLAUDE.md gives `REQ032`'s entitlement guard.

## A documented pitfall re-discovered, correctly resolved differently this time

The first cross-org-impersonation-rejection test used an `admin` actor and
failed — `isPlatformOperator()` treats admin/super_admin as platform-wide
unconditionally, the exact trap CLAUDE.md's Phase G+2 account describes
for `webhooks`/`api-keys`. Unlike that prior fix (widen the gate to
include `manager`), here the *correct* behavior genuinely is "a platform
admin can impersonate any org's user" — the real support-debugging use
case. Fixed by asserting the real intended behavior, plus a second test
proving the org-isolation check is real for a hypothetical org-scoped
actor role, not dead code. Full account in `PLAN076`.

## Verification

Backend unit: 77/77 suites, 1116/1116 tests (was 76/1096). Integration
(from host): 4/4 suites, 333/333 tests (unchanged — `break-glass` added to
`matrix-coverage.int-spec.ts`'s `EXEMPT` list, self-scoped by user not
org, same shape as the existing `notifications` exemption). `eslint`/
`tsc --noEmit` clean.
