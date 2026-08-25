---
id: TP129
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN102
related: [BUG025]
---

# TP129 — Test plan for the `Patient.appointments` scoping fix (F-05)

## `patients.service.spec.ts` (extended, same file/pass as `TP128`)

| # | Case | Expected |
|---|---|---|
| 1 | Staff caller | Scoped via `{clinic: {client_org_id}}` |
| 2 | Clinician caller | Additionally scoped to `clinician_id` |
| 3 | Patient caller viewing a dependant | `patient_id` stays the dependant's, not narrowed to the caller's own |
| 4 | Platform operator | No org filter |

## Full-suite gate (Hard Rule 3)

Same combined run as `TP128` (same file, same pass):
```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

`patient(id).appointments` against a real patient with 2 real
appointments, as a real manager caller.
