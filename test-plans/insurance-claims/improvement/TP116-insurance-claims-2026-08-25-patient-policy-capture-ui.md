---
id: TP116
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN089
related: [REQ062]
---

# TP116 — Test plan for patient insurance policy capture UI

## Frontend unit — `frontend/src/pages/patients/detail.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | No policies recorded | Real empty state shown on the Insurance tab |
| 2 | Real policies exist | Payer name, policy number, and active/inactive status all render |
| 3 | Recording a new policy | Real `createPatientInsurancePolicy` mutation fires with the correct `input` shape (patient_id from the real route param, payer_id, policy_number, policy_holder_name, valid_from); the new policy appears after refetch |

## e2e — `frontend/e2e/gap-analysis-a4-a8.spec.js` (shared A-4–A-8 fixture file, new)

| # | Scenario | Assertion |
|---|---|---|
| 1 | Staff opens a real patient's Insurance tab and records a policy against a real Payer fixture | The real mutation response is OK with no GraphQL errors; the new policy's number and payer name both appear in the list |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test -- --runInBand && npm run build
npx playwright test gap-analysis-a4-a8.spec.js --workers=1
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite not re-run since
no backend file was touched (confirmed via `git status`).
