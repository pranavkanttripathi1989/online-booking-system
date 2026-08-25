---
id: TP124
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN097
related: [REQ070]
---

# TP124 — Test plan for the clinical-hours auto-responder

## `org-settings.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Platform operator | `myClinicalHours` returns `null`, no query |
| 2 | Org-scoped caller | Scoped strictly to `{id: org}` |
| 3 | Never configured | Fields returned `undefined`, not `null` |
| 4 | Platform operator on update | Rejected with a clear message |
| 5 | Valid update | All 3 fields written, `success: true` |
| 6 | Explicit `null` | Clears the field |
| 7 | Omitted field | Left untouched |
| 8 | DB error | `{success: false}`, not thrown |

## `messages.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | Not `patient_clinic` | No auto-reply |
| 2 | Sender not a patient | No auto-reply |
| 3 | No assigned staff | No auto-reply |
| 4 | Clinical hours not fully configured | No auto-reply |
| 5 | Inside clinical hours | No auto-reply |
| 6 | Outside clinical hours, no prior reply this burst | Auto-reply sent from the assignee |
| 7 | Outside clinical hours, already replied this burst | No second auto-reply |
| 8 | Any participant is a patient | `thread_type: 'patient_clinic'` |
| 9 | No patient participant | `thread_type: 'staff_internal'` |

Plus: fixed a pre-existing test whose exact-object assertion on
`messageThreads.create` broke once `thread_type` became an always-real
value (loosened to `objectContaining`, matching every other assertion in
that describe block).

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Real patient→staff thread, real assignment, real clinical-hours config,
real message send outside the configured window, burst-suppression on a
second message, explicit-null revert of the config afterward.
