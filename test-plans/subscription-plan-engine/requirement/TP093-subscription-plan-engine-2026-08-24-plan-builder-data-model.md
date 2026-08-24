---
id: TP093
type: requirement
feature: subscription-plan-engine
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ032
related: [PLAN066]
---

# TP093 — Test plan: plan-builder data model and versioning

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4 (a
routine additive CRUD+versioning domain matching an already-proven module
scaffold).

## Unit — `plans.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | New plan input with feature flags + quotas | `create()` | First `PlanVersion` created at `version: 1`; price converted rupees→paise |
| TC-02 | An unknown `plan_id` | `createNewVersion()` | Rejected `BadRequestException` |
| TC-03 | A plan with one open version (`v1`, `effective_until: null`) | `createNewVersion()` | `v1` gets `effective_until` stamped (closed, not deleted or mutated in place); a new `v2` row created with the new field values |
| TC-04 | `setActive(id, false)` | | Toggles `Plans.is_active` only, never touches `PlanVersions` |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-05 | `npx tsc --noEmit` | Clean |
| TC-06 | `npx eslint` | 0 errors |
| TC-07 | `npm test` | All green |
| TC-08 | `npm run test:int` | All green (`plans` classified `EXEMPT` — platform-level, no client_org_id, same shape as `organizations`) |

## Live verification

| Case | Given | When | Then |
|---|---|---|---|
| TC-09 | Real super_admin caller | `createPlan` then `createPlanVersion` against the live backend | New plan visible via `plans` query; the original version's `effective_until` is set; the plan's `current_version` resolves to the new version |
