---
id: TP125
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN098
related: [REQ071]
---

# TP125 — Test plan for message-thread timeline linkage

## `encounters.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Patient caller with a genuine dependant | `assertPatientAccess` allows it (widened check) |
| 2 | Patient with no linked login | No `messageThreads.findMany` call at all |
| 3 | Patient with a linked login and a real `patient_clinic` thread | `message_thread` event appears in the timeline |
| 4 | Patient caller neither self nor dependant | Still rejected |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Temp-link a demo patient account to a real `Patients` row, query
`patientTimeline` for that patient, confirm a real `message_thread`
event appears (reusing `REQ070`'s own live thread fixture), revert the
link.
