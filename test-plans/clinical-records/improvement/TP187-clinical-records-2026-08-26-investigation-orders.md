---
id: TP187
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN167
related: []
---

# TP187 — Test plan: investigation orders

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Locked encounter rejected | `orderInvestigation` on a locked encounter | `BadRequestException`; `testResults.create` never called |
| 2 | Default urgency | Order with no `urgency` supplied | Created row has `urgency: 'routine'`, `status: 'pending'` |
| 3 | Explicit urgency | Order with `urgency: 'stat'` | Created row has `urgency: 'stat'` |
| 4 | Appears on refetch | Order, then `encounter()` on the same id | `investigation_orders` includes the new order |
| 5 | Frontend empty state | `EncounterWorkspace` with no orders | "No investigations ordered yet." shown |
| 6 | Frontend renders real orders | `EncounterWorkspace` with one order | Test name + type rendered, not fabricated |
| 7 | Frontend orders via real mutation | Fill dialog, submit | Real `orderInvestigation` call with typed fields; list re-fetches to show it |
| 8 | Full suite regression | Backend unit + integration; frontend `EncounterWorkspace` suite | 92/92 / 1484/1484; integration 4/4 / 387/387 unchanged; frontend 7/7 |
| 9 | Lint/typecheck clean | All touched files, no new lint warnings | 0 errors; hex-literal warning count unchanged from pre-slice baseline |
