---
id: TP119
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN092
related: [REQ065]
---

# TP119 — Test plan for dependant self-scoping (prescriptions + test results)

## Backend unit — `prescriptions.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | All pre-existing tenant-isolation/self-scoping cases (unchanged assertions) | Still pass against the widened check — a patient with no dependants configured behaves identically to before |
| 2 | A patient reads a dependant's prescription via `prescription()` | Returned, not rejected |
| 3 | A patient reads a prescription belonging to neither themself nor a dependant | Still rejected with `NotFoundException` |
| 4 | A patient lists a dependant's prescriptions via `patientPrescriptions()` | Returned, not rejected |
| 5 | A patient requests `patientPrescriptions` for a patient who is neither themself nor a dependant | Rejected with `NotFoundException`, `prisma.prescriptions.findMany` never called |

## Backend unit — `test-results.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | A patient caller's `findAll` filter | `where.patient_id` is `{ in: [ownId] }`, not a scalar (updated assertion) |
| 2 | A patient with a configured dependant | `findAll`'s filter includes both ids: `{ in: [ownId, depId] }` |
| 3 | A patient reads a dependant's result via `findOne` | Returned, not rejected |
| 4 | A patient reads a result belonging to neither themself nor a dependant | Still rejected with `NotFoundException` |
| 5 | A self-registered (org-less, unlinked) caller | `findAll`'s filter is `{ in: ['__no_patient_link__'] }` — fail-closed sentinel, not an unfiltered list (updated assertion) |

## Full-suite gate before commit (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

No frontend changes in this slice — the frontend already calls
`prescription`/`patientPrescriptions`/`testResults`/`testResult`
unchanged; this is a pure backend authorization widening, invisible to
the GraphQL contract shape.
