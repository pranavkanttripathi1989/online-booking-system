---
id: TP128
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN101
related: [BUG024]
---

# TP128 — Test plan for `Patients.client_org_id` (F-04)

## `patients.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Staff caller, `findAll` | Scoped to `client_org_id` directly |
| 2 | Platform operator, `findAll` | No org filter |
| 3 | Staff caller, `findOne`, own org | Returned |
| 4 | Staff caller, `findOne`, different org | Not found |
| 5 | Staff caller, `findOne`, `client_org_id: null` | Not found |
| 6 | Platform operator, `findOne`, `client_org_id: null` | Returned |
| 7 | Patient caller, `findOne`, own record, `client_org_id: null` | Still returned (identity check alone is sufficient) |
| 8 | `create()` | Stamps caller's org |
| 9 | `create()`, org-less non-platform caller | Rejected, no write |
| 10-13 | `appointments()` resolve-field (F-05, same pass) | See `TP129` |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

Also required: `test/integration/setup/fixture.ts`'s own `Patients`
fixture rows need `client_org_id` stamped, or the tenancy matrix's
`patients` domain cases fail with empty results (found live — see `TR127`).

## Live verification

Real `patients`/`createPatient` calls against the dev DB, blast-radius
count matched exactly.
