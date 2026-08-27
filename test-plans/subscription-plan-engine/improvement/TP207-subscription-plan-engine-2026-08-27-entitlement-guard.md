---
id: TP207
type: improvement
feature: subscription-plan-engine
created: 2026-08-27
updated: 2026-08-27
status: approved
parent: REQ147
related: [PLAN187, TR207]
---

# TP207 — Test plan: entitlement guard

Higher-risk slice (touches a shared guard mechanism, per `CLAUDE.md`'s own
standing caution) — drafted directly against the already-proven
`RolesGuard`/`PermissionsGuard` pattern, no `test-suggestions/` entry.

## Backend unit

- `entitlements.service.spec.ts`: ungated defaults (null org, no
  `plan_id`, no currently-effective `PlanVersion` — three distinct
  fail-open paths); the asymmetric unlisted-key defaults (`hasFeature`
  → `false` once gated, `getQuota` → `null`/unlimited); Redis cache hit
  skips Postgres entirely; a `null` result is cached too (not skipped);
  `invalidateOrg`/`invalidateOrgsOnPlan` target the right key(s), and
  the latter is a no-op with zero orgs on the plan.
- `entitlement.guard.spec.ts`: no `@RequiresFeature()` metadata → pass
  through, no service call; platform operator → pass through
  unconditionally, no service call; entitled → pass; not entitled →
  `ForbiddenException` naming the feature; no `req.user` → pass through
  without calling the service (defensive — `GqlAuthGuard` already
  rejects this case earlier in the chain).
- `entitlements.resolver.spec.ts`: `myEntitlements` maps a resolved set
  into `{is_gated, feature_flags[], quotas[]}`; maps `null` into
  `{is_gated:false, [], []}`; always scoped to the caller's own JWT
  `client_org_id`, never a client-supplied argument (there is none).
- `organizations.service.spec.ts`/`organizations.resolver.spec.ts`:
  `assignPlan`/`assignOrgPlan` — assigns, clears (`null`), rejects an
  unknown org or plan, invalidates the cache on every real change
  (including clearing), the resolver's `@Auth` gate matches every other
  mutation on this resolver.
- `plans.service.spec.ts`: `createNewVersion`/`setActive` both call
  `invalidateOrgsOnPlan` for the plan being edited.
- `pharmacy.resolver.spec.ts` (new): `receiveStock` carries both
  `@RequiresFeature('pharmacy')` and `EntitlementGuard` in its guard
  metadata; no other pharmacy handler carries the feature-flag metadata
  — this is a narrow, deliberate proof of concept, not a blanket gate.
- `clinicians.service.spec.ts`: the `max_clinician_seats` quota — a
  no-op when ungated, allows under quota, rejects at quota with a clear
  message naming both the limit and the current count, scopes the
  count query to the *target clinic's* org (not the caller's, since a
  platform operator has none of their own).

## Backend integration

- `matrix-coverage.int-spec.ts`: the new `entitlements` resolver domain
  is classified (`EXEMPT`, not silently missed) — this is the anti-rot
  gate this exact slice would otherwise have shipped past.

## Frontend unit

- `admin/Organizations.test.jsx` (new): the plan-assignment dialog lists
  the real plan catalog, disables an inactive plan, assigns via the
  real `assignOrgPlan` mutation and refreshes the list, clears back to
  "None — unrestricted" sending `planId: null` (not omitted), surfaces
  a real `userError` instead of failing silently.
- `manager/pharmacy/index.test.jsx` (extended): the real "Receive
  Stock" button renders for an ungated org; it is **replaced** (not
  disabled) by an upgrade prompt for a gated-and-blocked org; the
  prompt names why and how to upgrade.

## Live round trip (required — technical-plans/08 §7)

A mocked-Prisma unit test proves the `where`/logic each service built;
only a real HTTP round trip against the real running stack proves the
guard, the quota check, and the cache invalidation actually work
together end-to-end:

1. Create a real `Plan`+`PlanVersion` (`pharmacy: false`,
   `max_clinician_seats: 1`).
2. Assign it to a real org via `assignOrgPlan` — confirm `myEntitlements`
   flips for a real `manager` session of that org, with no manual cache
   clear.
3. `receiveStock` — confirm a real `ForbiddenException` from the guard,
   before the mutation reaches the service (fake ids never surface
   their own "not found" error).
4. `createClinician` — confirm a real `ForbiddenException` from the
   quota check, reporting the real current count against the real limit.
5. Clear the assignment — confirm `myEntitlements` returns to ungated
   immediately.
