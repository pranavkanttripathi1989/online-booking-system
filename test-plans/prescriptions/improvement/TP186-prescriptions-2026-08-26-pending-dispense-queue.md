---
id: TP186
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN166
related: []
---

# TP186 — Test plan: pending-dispense queue

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Org scoping | `pendingDispenseItems(orgAUser)` | `where.prescription = {encounter: {client_org_id: 'org-a'}}` |
| 2 | Nothing dispensed yet | One item, no matching `StockMovements` | `dispensed_qty: 0`, `remaining_qty` = full `qty` |
| 3 | Partial dispense | Groupby returns `-4` | `dispensed_qty: 4`, `remaining_qty` reduced accordingly |
| 4 | Fully dispensed excluded | Groupby returns `-qty` | Item absent from the result |
| 5 | Oldest-first ordering | Query assertion | `orderBy: {prescription: {issued_at: 'asc'}}` |
| 6 | Short-circuit on empty | No eligible items | `stockMovements.groupBy` never called |
| 7 | Frontend tab lists + dispenses | `manager/pharmacy` Pending Dispense tab | Row rendered; "Dispense" pre-fills FEFO batch + remaining qty; submits the real mutation; queue re-fetches |
| 8 | Full suite regression | Backend unit + integration; frontend pharmacy page suite | 92/92 / 1480/1480; integration 4/4 / 387/387 unchanged; frontend 7/7 |
| 9 | Lint/typecheck clean | All touched files | 0 errors |
