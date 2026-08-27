---
id: PLAN187
type: improvement
feature: subscription-plan-engine
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ147
related: [TP207, TR207]
---

# PLAN187 — Entitlement guard (US-PLAN-03)

## Contract (technical-plans/08's five decisions)

1. **Dialect**: canonical snake_case, matching `PlanType`/`OrganizationType`'s
   existing conventions exactly (`feature_flags`, `quotas`, `plan_id`).
2. **Response convention**: `assignOrgPlan` reuses the existing
   `OrganizationMutationResultType` (`{success, userErrors, organization}`)
   — the same `toResult()` HttpException-mapping helper every other
   `organizations.resolver.ts` mutation already uses, read verbatim
   before adding the new mutation, not re-derived.
3. **Argument shape**: `assignOrgPlan(orgId: ID!, planId: ID)` — planId
   nullable (clears the assignment); the resolver treats an omitted
   argument the same as an explicit `null`, not `undefined`, tested
   directly.
4. **Auth gate**: `assignOrgPlan` — `admin`/`super_admin`, matching
   every other mutation on this resolver (organization management is
   platform-admin-only by this domain's own existing convention,
   confirmed by reading the file before adding to it — not assumed).
   `myEntitlements` — no role gate at all, self-scoped off the caller's
   own JWT `client_org_id`, the same "the scoping IS the access
   control" pattern `notifications()` already uses.
5. **Invalidation**: `assignOrgPlan` calls `invalidateOrg` unconditionally
   (including when clearing to null); `createPlanVersion`/`setActive`
   call `invalidateOrgsOnPlan` (every org currently on that plan, found
   via `findMany`, not just the one being edited).

## Sequencing — read the caution, then followed it literally

1. **Schema first**: `ClientOrganizations.plan_id` + FK, migration
   `20260827030000_org_plan_assignment`. Read `Plans`' own existing
   model before adding the back-relation — `versions PlanVersions[]`
   already there, `organizations ClientOrganizations[]` added alongside
   it.
2. **The read path, in isolation**: `EntitlementsService` written and
   unit-tested (21 tests) *before* anything else in this slice touched
   a resolver at all — `resolveEntitlements`/`hasFeature`/`getQuota`,
   the ungated-vs-gated defaults (see `REQ147`'s own "asymmetric on
   purpose" note: an unlisted feature flag defaults to *not granted*
   once a plan exists, but an unlisted quota defaults to *unlimited* —
   a real, documented judgment call, not an oversight), and the
   two-tier cache invalidation (`invalidateOrg`, `invalidateOrgsOnPlan`).
3. **The guard, as its own file, tested against `roles.guard.spec.ts`'s
   own established `GqlExecutionContext.create` mocking pattern** — a
   first draft used `require('@nestjs/graphql')` inside the test file
   instead of a static import, which silently broke the mock (the guard
   under test never saw the mocked user, so every assertion that
   depended on it passed *for the wrong reason* — `!user` short-circuited
   true regardless of the mocked role). Caught by checking why a
   platform-operator test passed without actually proving the mock
   worked, not by a failure. Fixed by matching
   `ip-whitelist.guard.spec.ts`'s own precedent exactly (static import,
   `jest.spyOn(GqlExecutionContext, 'create')`).
4. **Wired into exactly two real call sites**, chosen for being the
   schema's own already-written examples, not picked arbitrarily:
   `pharmacy.receiveStock` (feature flag) and `clinicians.create`
   (quota). Each required its own module to import `EntitlementsModule`
   (`PharmacyModule`, `CliniciansModule`, `OrganizationsModule`,
   `PlansModule`) — `EntitlementsModule` itself was **not** added to
   `app.module.ts`'s own top-level `imports` array, deliberately: NestJS
   picks up a transitively-imported module's own resolvers
   automatically, and `app.module.ts` carries a separate, uncommitted,
   concurrent session's own `TasksModule` change this slice had no
   reason to touch.
5. **`domain-cases.ts`/`matrix-coverage.int-spec.ts`'s own anti-rot
   gate caught the new `entitlements` domain immediately** — added to
   `EXEMPT`, same shape and same reasoning as `org-settings`'s own
   `myOrgBranding` exemption (self-scoped off JWT `client_org_id`, no
   client-supplied id to construct a cross-org matrix case from).
6. **Live verification against the real stack** — see `TR207` for the
   full account, including the two real environment gaps it surfaced
   (no seeded `super_admin` account; two real orgs' ids had to be
   probed to find which one the seeded `manager@medibook.dev` account
   actually belongs to, since no query exposes it directly).

## Real findings during this slice

1. **A test-mocking bug that would have shipped a false-positive test
   suite**: the guard spec's first draft used a dynamically-required
   `@nestjs/graphql` module for `jest.spyOn`, which under ts-jest/CommonJS
   interop is a *different module instance* than the one the guard file's
   own static import resolves — the mock silently never took effect.
   Every test that should have proven "the guard reads the mocked user
   correctly" instead proved "the guard's own `!user` early-return
   fires regardless of the mock," passing for the wrong reason. Fixed
   by matching this codebase's own established pattern
   (`ip-whitelist.guard.spec.ts`) exactly rather than re-deriving one.
2. **No seeded `super_admin` account exists in this dev database at
   all** — `createPlan`/`setPlanActive` are `super_admin`-only, and
   every documented demo account (`admin@`, `manager@`, `clinician@`,
   `receptionist@`, `patient@medibook.dev`) is a different role.
   Confirmed via direct SQL. Worked around by temporarily reassigning
   `admin@medibook.dev`'s `role_id` to the (already-seeded, unused)
   `super_admin` role row, running the live verification, then
   reverting it — the same "temp-linked, then reverted" discipline this
   session's own history already uses elsewhere. A real seed
   `super_admin` account is a small, separate, worth-logging follow-up
   if plan-catalog testing becomes routine.

## Definition of done

- [x] Backend: 101 suites / 1652 tests green, `tsc --noEmit` clean,
  `eslint` clean, integration 4/4 suites / 387/387 tests green
  (including the new `entitlements` EXEMPT classification).
- [x] Frontend: `npx prettier --check .` clean, `npm run lint` 1,906
  warnings/0 errors (unchanged), `npm run build` + `npm run size` green,
  full suite 31 suites / 211+ tests — 4 suites flaky under
  full-parallel contention, all 4 pre-existing and confirmed (not newly
  introduced by this slice; `settings/index.test.jsx` re-confirmed 5/5
  green alone).
- [x] Live verification: full plan-create → assign → block (feature +
  quota) → clear → unblock round trip against the real running stack,
  not just mocked tests.
