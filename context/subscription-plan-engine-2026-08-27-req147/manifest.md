---
id: CTX-subscription-plan-engine-2026-08-27-req147
type: improvement
feature: subscription-plan-engine
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ147
related: [REQ032, PLAN187, TP207, TR207]
---

# subscription-plan-engine — Entitlement guard (2026-08-27)

Slice **P1-04**, fourth slice of Phase 1
(`project-plans/phase-plans/01-phase1-close-the-gates.md`). Closes
`REQ032`'s own `US-PLAN-03` — the one part of the plan-builder
requirement `CLAUDE.md` explicitly told future work not to rush.
`REQ032` itself flips to `done`.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ147 | [Entitlement guard](../../requirements/subscription-plan-engine/improvement/REQ147-subscription-plan-engine-2026-08-27-entitlement-guard.md) |
| implementation-plans | PLAN187 | [implementation plan](../../implementation-plans/subscription-plan-engine/improvement/PLAN187-subscription-plan-engine-2026-08-27-entitlement-guard.md) |
| test-plans | TP207 | [test plan](../../test-plans/subscription-plan-engine/improvement/TP207-subscription-plan-engine-2026-08-27-entitlement-guard.md) |
| test-results | TR207 | [results](../../test-results/subscription-plan-engine/improvement/TR207-subscription-plan-engine-2026-08-27-entitlement-guard.md) |

## What shipped, in the order the standing caution asked for

1. **Data model**: `ClientOrganizations.plan_id` → `Plans`, nullable
   (no real org has one assigned yet).
2. **Read path**: `EntitlementsService` — `resolveEntitlements`/
   `hasFeature`/`getQuota`, Redis-cached, explicit invalidation on both
   a direct org→plan change and any edit to a plan's own catalog data.
3. **The guard, integrated as its own reviewed step**: `EntitlementGuard`
   + `@RequiresFeature()`, deliberately **not** in the global
   `APP_GUARD` chain — opt-in per resolver only.
4. **Two concrete proofs of concept**, matching the schema's own
   pre-written examples: `pharmacy.receiveStock` (feature flag),
   `clinicians.create`'s `max_clinician_seats` (quota).
5. **Frontend**: `admin/Organizations.jsx` plan-assignment dialog;
   `manager/pharmacy/index.jsx`'s upgrade prompt replacing the blocked
   "Receive Stock" button.

## A real test-mocking bug found and fixed before it shipped

`entitlement.guard.spec.ts`'s first draft mocked `GqlExecutionContext.create`
via a dynamic `require()` instead of a static import — under ts-jest
this resolves to a different module instance than the guard file's own
import, so the mock silently never applied. Every test passed for the
wrong reason (the guard's `!user` early-return fired regardless of the
mock). Caught by questioning *why* a test passed, not by a failure.
Fixed by matching `ip-whitelist.guard.spec.ts`'s own established
pattern exactly.

## Live verification

Full round trip against the real running stack: created a real Plan
(`pharmacy: false`, `max_clinician_seats: 1`), assigned it to a real
org with 27 real clinicians, confirmed `myEntitlements` flipped
instantly (no manual cache clear), confirmed `receiveStock` and
`createClinician` both correctly rejected with real, specific error
messages, confirmed clearing the assignment instantly ungated again.
Two real environment gaps found along the way: no seeded
`super_admin` account exists in this dev DB (worked around by
temporarily reassigning and reverting `admin@medibook.dev`'s role);
no query exposes a caller's own org id directly (found by probing).
All test residue cleaned up (plan deactivated, assignment cleared,
role reverted, confirmed via a follow-up query).
