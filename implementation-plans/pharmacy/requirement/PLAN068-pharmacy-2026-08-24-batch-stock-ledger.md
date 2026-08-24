---
id: PLAN068
type: requirement
feature: pharmacy
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ022
related: []
---

# PLAN068 — Implementation plan: per-clinic drug batch/stock ledger

## Scope

The P0 foundation: receive stock into a batch, dispense against a
prescription item, and manually adjust remaining quantity — the
receive→dispense→adjust core `REQ022`'s own P1 stories (purchase orders,
FEFO suggestions, GST purchase invoicing, Schedule H/H1 prompts) build on
top of. Confirmed via schema read before designing: zero stock/batch/
inventory concept anywhere (`Products.stock_quantity` is a flat, unbatched
`Int?` — the only stock-adjacent field in the whole schema), matching
CLAUDE.md's own note ("Products is retail-catalogue only, no batch/stock
ledger").

## Design

`DrugBatches` (drug_id, clinic_id, client_org_id, batch_number,
expiry_date, quantity_received, quantity_remaining) + `StockMovements`
(batch_id, movement_type: `receipt|dispense|adjustment|expiry_writeoff`,
signed `quantity_delta`, optional `reference_type`/`reference_id`,
`created_by_user_id`) — append-only by design, matching the requirement
doc's own explicit non-functional note ("never a mutated balance column
alone"). `DrugBatches.quantity_remaining` is a maintained running total;
`StockMovements` is the audit trail that can reconstruct it independently.

New `backend/src/pharmacy/` module, not `inventory/` — matches the PRD's
own module name (M9) and keeps `backend/src/drugs/` (reference-data
master, `REQ044`) cleanly separate from `pharmacy/` (per-clinic
operational stock), the split the requirement doc itself draws.

`dispensePrescriptionItem(prescriptionItemId, batchId, quantity)` validates
the batch's drug matches the prescription item's drug (Prescriptions →
PrescriptionItems → drug_id, a real FK confirmed present already) before
decrementing, and rejects a quantity exceeding what remains — all inside
one `$transaction` alongside the `StockMovements` audit row. Pure internal
tracking, zero external pharmacy-system integration.

## Files touched

- `backend/prisma/schema.prisma` — new `DrugBatches`, `StockMovements` models.
- `backend/src/pharmacy/` (new module) — `module/resolver/service`,
  `dto/pharmacy.input.ts`, `entities/pharmacy.entity.ts`.
- No frontend UI in this slice — the GraphQL surface (`drugBatches`,
  `stockMovements`, `receiveStock`, `adjustStock`,
  `dispensePrescriptionItem`) is real and tested; a pharmacy-counter admin
  page (batch receiving form, a dispense action wired into the existing
  prescription view) is deliberately deferred — this whole module is P1
  (V1 GA) per the requirement doc's own phase assignment, and building a
  polished dispense UI ahead of the purchasing/FEFO/compliance layers it
  needs to be genuinely usable would be premature, logged as open.

## GraphQL contract

`drugBatches(clinic_id, drug_id)`, `stockMovements(batch_id)` queries;
`receiveStock`, `adjustStock`, `dispensePrescriptionItem` mutations — all
gated `staff, manager, admin, super_admin` (a front-desk/pharmacy-counter
operation). No existing frontend contract to match — genuinely new surface.

## Test plan

See `TP095`.

## Test results

See `TR094`.
