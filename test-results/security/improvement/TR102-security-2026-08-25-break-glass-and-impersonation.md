---
id: TR102
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP103
related: [PLAN076]
---

# TR102 — Test results: break-glass access + impersonation audit trail

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP103 case outcomes

All 20 cases pass. `auth.service.spec.ts` (8 new impersonation cases),
`audit-log.interceptor.spec.ts` (2 new impersonation-attribution cases),
`break-glass.service.spec.ts` (11 new cases).

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 77/77 suites, 1116/1116 tests (was 76/1096 after REQ052) |
| `backend: npm run test:int` (from host) | 4/4 suites, 333/333 tests (unchanged — `break-glass` is EXEMPT, not a new CASES row) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |

## Real issues found and fixed during this pass

1. **A documented pitfall re-discovered, not a new bug**: the first test
   for cross-org impersonation rejection used an `admin`-role actor and
   failed, because `isPlatformOperator()` treats `admin`/`super_admin` as
   platform-wide unconditionally — the exact trap CLAUDE.md's own Phase
   G+2 account describes. Unlike that prior instance, the *correct*
   behavior here genuinely is "a platform admin can impersonate any org's
   user" (the real support-debugging use case) — fixed by rewriting the
   test to assert that, plus a second test proving the org-isolation check
   is real (not dead code) for a hypothetical org-scoped actor role.
2. Two test-authoring bugs in `audit-log.interceptor.spec.ts`'s new cases
   — both forgot to mock `clientOrganizations.findUnique`, causing the
   interceptor to silently short-circuit before ever writing a log row.
   Caught immediately by the test's own 0-calls failure; fixed by adding
   the missing mock, matching the file's own pre-existing pattern.
3. A `tsc` type error: `client_org_id: target.client_org_id ??
   actor.client_org_id` could still resolve to `null` if neither had an
   org, which the schema's required `String` column correctly rejected at
   compile time. Fixed by handling that edge case explicitly — reject with
   a clear message rather than attempt a null write.

## Verification

Real, not just unit-tested: `npx prisma validate`, a full migration
apply + `prisma generate` on both host and container, and the full
verification suite above.
