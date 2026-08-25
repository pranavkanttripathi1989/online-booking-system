---
id: TP131
type: bug
feature: test-results
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN104
related: [BUG027]
---

# TP131 — Test plan for `orderTest`'s `patient_id` fix (F-08)

## `test-results.service.spec.ts` — new `orderTest` describe block

| # | Case | Expected |
|---|---|---|
| 1 | Unknown `patient_id` | Rejected, no `create` call |
| 2 | Patient in a different org | Rejected (Hard Rule 6), no `create` call |
| 3 | Valid patient | `patient_id` written on the created row |
| 4 | Platform operator, patient with `client_org_id: null` | Order succeeds |

## Frontend

`npm run lint` clean (no new errors). No dedicated `test-results/index
.test.jsx` exists (pre-existing gap, not introduced here).

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
cd frontend && npm run lint && npm test && npm run build
```

## Live verification

Real `orderTest` with a real `patient_id`, confirmed via direct SQL.
Omitting `patient_id` confirmed rejected by GraphQL schema validation.
