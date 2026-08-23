---
id: TP075
type: requirement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ045
related: [PLAN048]
---

# TP075 — Test plan: onboarding wizard real backend

Direct test-plan against an already-proven pattern (a CRUD-and-transaction
service matching four other slices this session) — suggestion stage
skipped per `CLAUDE.md`'s working loop step 4 / `REQ013` Phase D.

## Unit — `organization-onboarding.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | An email already used by an existing `UserProfiles` row | `startOnboarding` called with that email | `ConflictException`, generic message (no account-existence leak) |
| TC-02 | An org code already in use | `startOnboarding` called, slug normalizes to that code | `ConflictException` |
| TC-03 | A brand-new org+owner | `startOnboarding` called | Org and owner created in one `$transaction`; owner's `UserProfiles.role_id` resolves to the seeded `manager` role and `client_org_id` is the **new** org's id, never `null` |
| TC-04 | An org id that doesn't exist | `selectPlan` called | `NotFoundException` |
| TC-05 | An org already `onboarding_status: completed` | `selectPlan` called | `BadRequestException` — this anonymous path has no further business touching a finished org |
| TC-06 | A `planId` that doesn't resolve to an active plan | `selectPlan` called | `NotFoundException` |
| TC-07 | A valid org + valid plan | `selectPlan` called | `OrganizationSubscriptions` row created (`status: trial`, `billing_cycle: monthly`); `trial_ends_at` set ~14 days out |
| TC-08 | An org with zero clinics | `complete` called | `BadRequestException`; `clientOrganizations.update` never called |
| TC-09 | An org with at least one clinic | `complete` called | `onboarding_status: completed`, `onboarding_step: null` |
| TC-10 | `SubscriptionPlans.features` stored as `{}` (default) rather than an array | `listActivePlans` called | Returned `features` is `[]`, not a thrown error |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-11 | `npx prisma validate` | Schema still valid (no migration in this slice) |
| TC-12 | `npx tsc --noEmit` | No new errors introduced by this slice's files |
| TC-13 | `npx eslint src/organization-onboarding src/app.module.ts prisma/seed.ts` | 0 errors, 0 new warnings |
| TC-14 | `npx jest organization-onboarding --maxWorkers=2` | All cases above pass |

## Live verification (manual, against `postgres_test`)

| Case | Given | When | Then |
|---|---|---|---|
| TC-15 | A freshly migrated + seeded `postgres_test` database | The full wizard sequence run via real GraphQL calls (`startOrganizationOnboarding` → `subscriptionPlans` → `selectOnboardingPlan` → `addOnboardingFirstClinic` → `completeOrganizationOnboarding`) | Each call succeeds against the real schema; the resulting `ClientOrganizations` row has `onboarding_status: completed`, a real `owner_user_id`, and exactly one `is_primary: true` clinic |

No dedicated Playwright e2e spec for this slice — the four-step mutation
sequence is exercised end-to-end by TC-15 against a real database, and the
frontend rewrite is a like-for-like swap of mock calls for real ones behind
the same UI already covered by prior manual verification passes (`BUG010`).
Logged as a deliberate scope decision, matching `REQ041`'s precedent, not a
silent gap.
