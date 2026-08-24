---
id: TR104
type: improvement
feature: organizations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP105
related: [PLAN078]
---

# TR104 — Test results: org->branch masters cascade

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP105 case outcomes

All 26 cases pass. `resolve-price.spec.ts` gained a 7-case "branch
override (4th argument)" describe block; `branch-overrides.service.spec.ts`
is new (14 cases); `appointment-payments.service.spec.ts` gained 4 new
cases (2 in `createRazorpayOrder`, 2 in `recordCounterPayment`); and the
new `branch-overrides` tenancy-matrix domain case.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 79/79 suites, 1165/1165 tests (was 78/1141 after REQ054) |
| `backend: npm run test:int` (from host) | 4/4 suites, 351/351 tests (was 342) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |
| Container compile (`docker restart` + `docker logs`) | "Nest application successfully started" |

## Two real issues found and fixed before commit

Both self-caught by `eslint`, not by a failing test:

1. An unused `pricingJsonToGraphQL` import — the entity's first draft only
   exposed `override_price`, omitting the override's own category/channel
   pricing entirely. Fixed by adding `override_category_pricing`/
   `override_channel_pricing` fields to `ProductBranchOverrideType`
   (reusing `CategoryPricingType`/`ChannelPricingType` from the `services`
   domain, matching this codebase's typed-field convention rather than a
   raw JSON scalar — confirmed `graphql-type-json` isn't even a dependency
   here) and wiring `toGraphQL()` to actually populate them.
2. An unused `orgBUser` test fixture in `branch-overrides.service.spec.ts`
   — fixed by adding the genuine cross-org assertion it was declared for
   (the org-wide list, with `clinic_id` omitted, scopes to org B for an
   org-B caller), not by deleting the fixture.

Neither is a design-correctness bug like the prior three slices found —
both were caught and fixed within the same implementation pass, before
the test suite was ever run.

## Verification

Real, not just unit-tested: `npx prisma validate`, a full migration apply
+ `prisma generate` on both host and container, a container restart with
a clean "Nest application successfully started" compile log, and the full
verification suite above.
