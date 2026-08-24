---
id: CTX-pharmacy-2026-08-24-req022
type: requirement
feature: pharmacy
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ022
related: [PLAN068, TP095, TR094]
---

# pharmacy — REQ022 slice: per-clinic drug batch/stock ledger (2026-08-24)

Fourth of eight requirement slices in this pass (REQ018 → REQ032 → REQ034
→ **REQ022** → REQ030 → REQ031 → REQ015 → REQ029).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN068 | [batch/stock ledger](../../implementation-plans/pharmacy/requirement/PLAN068-pharmacy-2026-08-24-batch-stock-ledger.md) |
| test-plans | TP095 | [verification plan](../../test-plans/pharmacy/requirement/TP095-pharmacy-2026-08-24-batch-stock-ledger.md) |
| test-results | TR094 | [verification results — pass](../../test-results/pharmacy/requirement/TR094-pharmacy-2026-08-24-batch-stock-ledger.md) |

## What shipped

`DrugBatches`/`StockMovements` — an append-only stock ledger (receipt/
dispense/adjustment/expiry_writeoff movement types, `DrugBatches
.quantity_remaining` a maintained running total, never the only record of
what happened). `dispensePrescriptionItem` links a real dispense event to
the actual `PrescriptionItems` row it fulfils, validating the batch's drug
matches. Pure internal tracking, zero external pharmacy-system
integration — confirmed via schema read before designing that
`Products.stock_quantity` (a flat, unbatched `Int?`) was the only
stock-adjacent field anywhere, matching CLAUDE.md's own "Products is
retail-catalogue only" note.

## What's deliberately NOT built

`PurchaseOrder`/`GoodsReceiptNote`/`StockTransfer`, FEFO dispense
suggestions, Schedule H/H1 compliance prompts, GST purchase invoicing,
low-stock alerts — all P1 per the requirement doc's own phase assignment
(this whole module is V1 GA, not MVP). This slice is the
receive→dispense→adjust foundation those build on.

## Next in this pass

REQ030 (signed outbound webhook delivery).
