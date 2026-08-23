---
id: PLAN048
type: requirement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ045
related: [PLAN046]
---

# PLAN048 — Implementation plan: onboarding wizard real backend

## Files touched

- `backend/src/organization-onboarding/organization-onboarding.module.ts` (new)
- `backend/src/organization-onboarding/organization-onboarding.service.ts` (new)
- `backend/src/organization-onboarding/organization-onboarding.resolver.ts` (new)
- `backend/src/organization-onboarding/organization-onboarding.service.spec.ts` (new)
- `backend/src/organization-onboarding/dto/organization-onboarding.input.ts` (new)
- `backend/src/organization-onboarding/entities/organization-onboarding.entity.ts` (new)
- `backend/src/app.module.ts` (register the new module)
- `backend/prisma/seed.ts` (seed `SubscriptionPlans` — no migration, table
  already existed empty)
- `frontend/src/pages/onboarding/index.jsx` (rewritten off `mocks/store.js`)

No schema migration — every column this slice needs
(`ClientOrganizations.owner_user_id`/`onboarding_status`/`onboarding_step`/
`trial_ends_at`, `SubscriptionPlans`, `OrganizationSubscriptions`) was
already live in `schema.prisma` from the original Phase 3.5 planning pass;
just never had a resolver or seed data.

## Design decisions

1. **Separate module from `organizations`, not an extension of it.**
   `organizations.service.ts`'s existing `create()` already carries a
   comment distinguishing the authenticated admin-CRUD path from this
   anonymous self-serve one. Folding this into the same resolver would mean
   either a confusing mix of `@Public()` and role-gated mutations on one
   class, or accidentally relaxing an admin mutation's guard. A dedicated
   module keeps the blast radius of "every mutation here is reachable
   without a JWT" contained to files whose name says so.
2. **Owner role is `manager`, not `admin`/`super_admin`.** CLAUDE.md is
   explicit that the platform-wide roles are org-less by definition
   (`client_org_id: null`) — an org's own owner needs to be scoped *to*
   that org, which only `manager` (the seeded per-org role) does. Minting
   an `admin` account here would have made every self-serve signup a
   platform operator, able to see every other tenant.
3. **`addOnboardingFirstClinic` bypasses `ClinicsService.create()`.** That
   method's signature takes `(input, user: JwtPayload)` and stamps
   `client_org_id` from `user.client_org_id` — there is no `user` in this
   flow. Re-deriving the same three lines (`prisma.clinics.create` with an
   explicit `client_org_id: orgId` and `is_primary: true`) directly in the
   onboarding service was simpler and clearer than threading a synthetic
   `JwtPayload` through a service designed around a real one.
4. **`selectOnboardingPlan` takes `planId`, not the mock era's `planCode`.**
   The real `SubscriptionPlans` model has no `code` column (`name` is the
   only unique key, and it's a display name, not a slug). Reusing `id` as
   the selection key avoids inventing a schema field purely to preserve a
   mock convention that was never a real contract to begin with (Hard Rule
   7 only binds an *already-live* contract — this page had none).
5. **`999999` sentinel for Enterprise's `max_clinics`/`max_users`.** Both
   columns are non-nullable `Int` with no "unlimited" representation.
   Adding nullability would be a real schema change for a cosmetic seed
   value; a documented sentinel keeps this slice's migration footprint at
   zero, consistent with `REQ016`'s own precedent for `Drugs.gst_rate`
   style seed shortcuts.

## Verification

- `npx tsc --noEmit` — clean for every file this slice touches (two
  pre-existing, unrelated errors remain elsewhere in the tree — missing
  `@nestjs/schedule`/`helmet` type declarations — logged separately, not
  caused by or fixed in this slice).
- `npx jest organization-onboarding --maxWorkers=2` — 10/10 pass (see
  `TR074`).
- `npx eslint src/organization-onboarding src/app.module.ts prisma/seed.ts`
  — 0 errors, 0 new warnings.
- `npx prisma validate` — schema unchanged, still valid.
