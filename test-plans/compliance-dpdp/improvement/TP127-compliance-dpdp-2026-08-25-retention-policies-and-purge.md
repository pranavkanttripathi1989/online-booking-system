---
id: TP127
type: improvement
feature: compliance-dpdp
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN100
related: [REQ073]
---

# TP127 — Test plan for retention policies and purge

## `consent.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `findRetentionPolicies` | Org-scoped to the caller |
| 2 | Platform operator on `setRetentionPolicy` | Rejected, upsert never called |
| 3 | Valid policy | Upserts on `(client_org_id, data_class)`, `legal_hold` defaults `false` |
| 4 | Explicit `legal_hold: true` | Honored on both `create` and `update` |

## `retention-purge.service.spec.ts` (new)

| # | Case | Expected |
|---|---|---|
| 1 | No due policies | No purge attempted |
| 2 | Query shape | `legal_hold: false`, `data_class: {in: ['test_results']}` |
| 3 | A due `test_results` policy | Correct cutoff year, org-scoped soft-delete |
| 4 | Unsupported data class somehow returned | Never touched |
| 5 | One policy's purge fails | Continues to the next |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

`setRetentionPolicy` + `retentionPolicies` against the real dev DB. The
purge sweep itself is not triggered live (cron-scheduled, mocked-Prisma
unit coverage is the primary verification for its cutoff/exclusion
logic).
