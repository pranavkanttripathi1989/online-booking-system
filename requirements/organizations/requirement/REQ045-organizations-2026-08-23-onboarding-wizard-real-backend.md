---
id: REQ045
type: requirement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ014
related: [REQ041]
---

# REQ045 — Organization onboarding wizard, real backend

Second vertical slice of `REQ014` (multi-branch org hierarchy and
onboarding), after `REQ041` (head-office designation). Targets `REQ014`'s
US-ORG-02: the self-serve SaaS signup wizard at `/get-started`.

## Why this slice

`frontend/src/pages/onboarding/index.jsx` has existed since the mock-data
era, backed entirely by `mocks/store.js` (`startOrganizationOnboarding`,
`selectOnboardingPlan`, `addOnboardingFirstClinic`,
`completeOrganizationOnboarding`). The columns it needs
(`ClientOrganizations.owner_user_id`/`onboarding_status`/`onboarding_step`/
`trial_ends_at`) were already live in the schema, and
`organizations.service.ts`'s own `create()` method carries a comment
distinguishing "Phase 4 admin-CRUD path" from "the Phase 3.5 self-serve
onboarding wizard, which creates `owner_user_id`/`onboarding_status`
transactionally" — a real backend for this flow was scoped but never built.
No frontend page in this codebase talked to a live org+owner-account signup
path before this slice.

## What was built

- New `backend/src/organization-onboarding` module — kept separate from the
  authenticated admin-CRUD `organizations` module, matching the
  already-documented Phase 3.5/Phase 4 split. Every operation is
  `@Public()`: this is an anonymous tenant-signup flow, not a JWT-bearing
  one, by design (CLAUDE.md: "Auth is a global guard, fail-closed by
  default" — every new resolver needs the annotation to opt out).
  - `subscriptionPlans` query — lists active `SubscriptionPlans` rows
    (a real table, live in the schema since Phase 3.5, never seeded or
    queried by anything until now).
  - `startOrganizationOnboarding(input)` — transactionally creates the
    `ClientOrganizations` row, a `Users`/`UserProfiles` row for the owner
    (role `manager`, `client_org_id` set to the new org — **not** `admin`/
    `super_admin`, which are platform-wide roles per CLAUDE.md, not an
    org's own owner), hashed via the same `BCRYPT_COST` policy as
    `auth.service.ts`'s `register()`. Rejects a duplicate owner email
    (generic `ConflictException`, matching `register()`'s own
    account-enumeration hygiene) and a duplicate org code.
  - `selectOnboardingPlan(orgId, planId)` — records a real
    `OrganizationSubscriptions` row (`status: trial`, `billing_cycle:
    monthly`) and sets a 14-day `trial_ends_at`. Rejects an org that has
    already completed onboarding, and a plan id that doesn't resolve to an
    active plan.
  - `addOnboardingFirstClinic(orgId, input)` — creates the org's first
    `Clinics` row directly (not via `ClinicsService.create()`, which
    requires an authenticated `JwtPayload.client_org_id` this anonymous
    flow doesn't have), and marks it `is_primary: true` — the wizard's only
    clinic is the org's head office by construction (`REQ041`), not a
    separate step.
  - `completeOrganizationOnboarding(orgId)` — refuses to complete with zero
    clinics added, otherwise sets `onboarding_status: completed`,
    `onboarding_step: null`, `onboarded_at: now()`.
- `prisma/seed.ts` gained real `SubscriptionPlans` seed data (Starter/Pro/
  Enterprise, matching the mock era's pricing) — the table existed but had
  never been seeded, so the plan-picker step would have rendered empty
  against a real, freshly-migrated database.
- `frontend/src/pages/onboarding/index.jsx` rewritten off `mocks/store.js`
  onto real `useQuery`/`useMutation` calls against the four operations
  above, inline `gql` per the public/self-serve dialect convention (this
  page had no prior real GraphQL contract to preserve). Plan selection now
  keys off `plan.id` (the real `SubscriptionPlans` primary key) rather than
  the mock era's `plan.code`, which has no real-schema equivalent.

## What this does not do

- No auto-login after `completeOrganizationOnboarding` — the wizard still
  ends on "Go to sign in", matching the pre-existing UX; issuing tokens
  here would pull in `auth.service.ts`'s session/refresh-token machinery
  for no product requirement that asked for it.
- No Departments/Resources, no multi-clinic-at-signup, no team-invite step
  (`mocks/store.js` never had one either) — out of this slice's scope, the
  same as `REQ041`.
- No CSV import / masters cascade — separate, larger `REQ014` scope.
- `SubscriptionPlans.max_clinics`/`max_users` are non-nullable `Int`
  columns with no "unlimited" representation; the Enterprise plan's seed
  row uses a documented `999999` sentinel rather than a schema change, to
  keep this slice's migration footprint at zero.
- No entitlement enforcement from the selected plan (`REQ032`, plan
  builder/entitlements, is separate, larger scope) — selecting a plan
  records the choice and starts the trial clock; it does not yet gate
  anything.
