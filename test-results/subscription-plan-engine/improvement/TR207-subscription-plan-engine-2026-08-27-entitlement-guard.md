---
id: TR207
type: improvement
feature: subscription-plan-engine
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP207
related: [REQ147, PLAN187]
---

# TR207 — Results: entitlement guard

## Backend

- `npx jest --maxWorkers=2`: **101 suites / 1652 tests, green.**
  New/extended: `entitlements.service.spec.ts` (21), `entitlement.guard.spec.ts`
  (5), `entitlements.resolver.spec.ts` (3), `pharmacy.resolver.spec.ts` (3,
  new file), plus additions to `organizations.service.spec.ts`,
  `organizations.resolver.spec.ts`, `plans.service.spec.ts`,
  `clinicians.service.spec.ts`.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **4 suites / 387 tests, green**, including
  `matrix-coverage.int-spec.ts`'s own anti-rot check — the new
  `entitlements` domain was correctly flagged as unclassified on first
  run (confirming the gate works) and closed by adding it to `EXEMPT`.

## Frontend

- `npx prettier --check .`: clean.
- `npm run lint`: **1,906 warnings, 0 errors** — unchanged from the
  pre-slice baseline.
- `npm run build` + `npm run size`: green, all 3 budgets unaffected
  (initial bundle 327.87/335 KB, largest lazy chunk 109.92/115 KB,
  CSS 13.5/18 KB gzipped).
- `admin/Organizations.test.jsx` (new): **5/5 green.**
- `manager/pharmacy/index.test.jsx`: **10/10 green** (7 pre-existing + 3
  new).
- Full suite (`CI=true npx jest --maxWorkers=2`): 31 suites, 211+ tests.
  4 suites failed on the full-parallel run
  (`booking/index.test.jsx`, `EncounterWorkspace.test.jsx`,
  `manager/claims/index.test.jsx`, `settings/index.test.jsx`) — all 4
  are pre-existing, documented contention flakes (three already named
  in `CLAUDE.md`'s own history; `settings/index.test.jsx` re-confirmed
  5/5 green in isolation). Neither of this slice's own two touched/new
  test files appeared in the failure list.

## A real test-mocking bug found and fixed before it could ship a
false-positive suite

`entitlement.guard.spec.ts`'s first draft mocked `GqlExecutionContext.create`
via a dynamically `require()`'d `@nestjs/graphql` module inside the test
file, instead of a static import matching `ip-whitelist.guard.spec.ts`'s
own established pattern. Under ts-jest/CommonJS interop this is a
different module instance than the one the guard file's own static
import resolves at runtime — the mock silently never applied. Every test
that should have proven "the guard correctly reads the mocked
`req.user`" instead passed because the guard's own `!user` early-return
fired regardless of what the mock claimed to set — a false-positive
green suite that would have shipped with zero real coverage of the
guard's actual authorization logic. Caught by noticing the
platform-operator test passed without the mock's own assertions ever
being meaningfully exercised, not by a failure — the whole point of
reading a test's own passing reason, not just trusting green. Fixed by
using the same static-import + `jest.spyOn(GqlExecutionContext, 'create')`
pattern this codebase already established.

## Live verification — full round trip against the real running stack

Performed exactly as `TP207` specifies, on a real org (City Heart Clinic
Group) with 27 real clinicians and no plan previously assigned:

1. `createPlan` — a real `Plan`+`PlanVersion` (`pharmacy: false`,
   `max_clinician_seats: 1`).
2. `assignOrgPlan` — confirmed `myEntitlements` for a real
   `manager@medibook.dev` session flipped from `is_gated: false` to
   `true`, **with no manual cache-clear step** — the explicit
   invalidation on assignment worked instantly, not just on the next
   TTL expiry.
3. `receiveStock` (fake clinic/drug ids) — rejected with the real
   `EntitlementGuard`-produced `ForbiddenException` naming `pharmacy`,
   confirmed the guard runs *before* the service layer (a "not found"
   error from fake ids never surfaced — the guard rejected first).
4. `createClinician` — rejected with the real quota message: *"Your
   organization's plan allows up to 1 clinician seats (currently using
   all 27)."* — both numbers are real, not placeholders.
5. `assignOrgPlan(planId: null)` — confirmed `myEntitlements` returned
   to `is_gated: false` immediately, proving invalidation works
   symmetrically in both directions.

## Two real environment gaps found and worked around, not silently
skipped

1. **No seeded `super_admin` account exists in this dev database** —
   confirmed via direct SQL against `UserProfiles`/`UserRoles`; every
   documented demo account is a different role. Worked around by
   temporarily reassigning `admin@medibook.dev`'s `role_id` to the
   already-seeded (but previously unused) `super_admin` role row for
   the duration of the live verification, then reverting it back to
   `admin` afterward — confirmed via a follow-up query.
2. **No query exposes a caller's own org id directly** — `me` has no
   `organization` field. Found `manager@medibook.dev`'s real org by
   probing which of the two real orgs in the dev DB actually flipped
   their `myEntitlements` result, rather than guessing.

## Cleanup

- The test `Plan` deactivated (`setPlanActive(is_active: false)`) — no
  `deletePlan` mutation exists, matching this session's own precedent
  of leaving inert test residue rather than force-deleting.
- The org's plan assignment cleared back to `null`.
- `admin@medibook.dev`'s role reverted to `admin`, confirmed via a
  direct SQL check.
