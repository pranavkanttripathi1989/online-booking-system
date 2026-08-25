---
id: TP121
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN094
related: [REQ067]
---

# TP121 — Test plan for near-expiry/low-stock alerts

## `pharmacy.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `nearExpiryBatches` where-shape | `quantity_remaining: {gt:0}`, `expiry_date.lte` a Date, org-scoped |
| 2 | Batch with a linked drug | `drug_name` resolved onto the result |
| 3 | No drug has `reorder_level` | `lowStockDrugs` returns `[]`, no `groupBy` call |
| 4 | Stock above threshold | Excluded |
| 5 | Stock at/below threshold | Included, correct shape |
| 6 | Zero matching batches | Treated as zero stock, still included |

## `low-stock-sweep.service.spec.ts` (new)

| # | Case | Expected |
|---|---|---|
| 1 | No drug configured | No notification |
| 2 | Stock above threshold | No notification |
| 3 | Stock at/below threshold | Every admin/manager in the org notified |
| 4 | Already alerted today | Skipped |
| 5 | Zero matching batches | Still notifies (zero stock) |
| 6 | One dispatch fails | Continues to the next recipient |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Real `nearExpiryBatches`/`lowStockDrugs` queries against the dev DB.
