---
id: REQ022
type: requirement
feature: pharmacy
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: REQ021
related: [REQ021, REQ016, REQ014, PLAN068, TP095, TR094]
---

## Status (2026-08-24)

**P0 batch/stock ledger foundation shipped** (`PLAN068`/`TP095`/`TR094`):
`DrugBatches`/`StockMovements` (append-only audit trail), `receiveStock`/
`adjustStock`/`dispensePrescriptionItem` mutations, tenant-scoped via the
same `orgScope()`/Hard-Rule-6 pattern as every other domain this session.
`dispensePrescriptionItem` links a dispense event to the real
`PrescriptionItems` row it fulfils. See
`context/pharmacy-2026-08-24-req022/manifest.md`.

**Deliberately NOT built**: `PurchaseOrder`/`GoodsReceiptNote`/
`StockTransfer`, FEFO dispense suggestions, Schedule H/H1 compliance
prompts, GST purchase invoicing, low-stock alerts — all genuinely P1 per
the requirement doc's own phase assignment (this whole module is V1 GA,
not MVP). This slice is the receive → dispense → adjust foundation those
build on.

# Pharmacy: multi-store inventory, dispense, purchasing, and statutory registers

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M9 — Pharmacy & Inventory** (`FR-PHR-01`–`FR-PHR-14`). Cross-referenced against `backend/src/products` and `project-plans/05-competitive-analysis.md` §2 ("pharmacy is a profit centre, often the biggest one in a small clinic").

## Current state vs. PRD ambition

`Products` today models a generic retail/service catalogue item — name, price, GST rate — with no batch tracking, no store concept, no stock ledger, and no purchase/GRN workflow. This is enough for a manager to list a sellable item, but nothing about actual pharmacy operations (dispensing against a prescription, tracking expiry, GST-compliant invoicing with HSN, statutory registers) exists. This entire module is net-new.

The PRD frames this as one of the product's three core differentiators (§1.3): the prescription-to-pharmacy loop only works if this module exists and is wired to `REQ021`'s signed prescriptions. Building pharmacy as a standalone inventory system without that wiring would satisfy the FR list on paper while missing the actual competitive point.

## Gap classification

- **Net-new, entirely.** `Products` remains useful as the generic catalogue item shape but needs a parallel, pharmacy-specific data model (`Store`, `Batch`, `StockLedger`) layered underneath it — not a rename or field-bolt-on to the existing table, since retail services (a consultation fee) and physical drug inventory (a batch of 500 tablets expiring in 14 months) are fundamentally different entities sharing only a price and a name.

## Phase assignment

PRD Phase: **V1 GA (P1)** in full — the PRD does not treat pharmacy as MVP-blocking, matching its own roadmap (§18, Q3 "Pharmacy... " lands after MVP GA). Recommended internal sequencing: after `REQ021` (prescriptions) exists, since the dispense queue's primary input is a signed prescription.

## Dependencies

- **Requires:** `REQ021` (prescriptions feed the dispense queue); `REQ016` (drug master — a `Batch` needs a `Product`/`Drug` to reference); `REQ014` (a `Store` is scoped to a branch, following the same cascade pattern as `Resource`).
- **Blocks:** none downstream, but `REQ023`'s GST-invoicing extension and `REQ031`'s insurance module both eventually reference pharmacy invoices as claim-supporting documents.

## User stories

### Epic: Multi-store stock

**US-PHR-01** — As a Branch Manager, I want separate stock ledgers for the main pharmacy and an OT sub-store, so that inventory in each location is tracked independently and doesn't get confused.
- PRD refs: FR-PHR-01
- Priority: P1
- Acceptance criteria: given two stores at one branch, stock movements in one never affect the other's balance; a stock transfer between them is an explicit, tracked transaction (`US-PHR-06`), not an implicit adjustment.

**US-PHR-02** — As a pharmacist, I want batch-wise stock with expiry and FEFO (first-expiry-first-out) suggestions at dispense time, so that I never accidentally dispense a batch expiring sooner while an earlier one sits unused.
- PRD refs: FR-PHR-03
- Priority: P1
- Acceptance criteria: given two batches of the same drug with different expiry dates, when dispensing, then the system suggests the earlier-expiring batch first, while still allowing an explicit override with a reason.

### Epic: Dispense

**US-PHR-03** — As a pharmacist, I want a dispense queue fed automatically by signed prescriptions, so that I know exactly what to prepare without a separate handoff process.
- PRD refs: FR-PHR-02, and the shared acceptance criterion with `REQ021` US-RX-09
- Priority: P1
- Acceptance criteria: given a prescription is signed at a branch with a pharmacy store, it appears in that store's queue with drug, dose, quantity, and patient — within the same transaction as the signing, not a delayed sync.

**US-PHR-04** — As a pharmacist, I want to substitute a drug when the exact brand is out of stock, with a reason captured and visible to the clinician, so that continuity of care isn't silently broken by a stock gap.
- PRD refs: FR-PHR-04
- Priority: P1
- Acceptance criteria: given a substitution is made, it is recorded on both the dispense record and the invoice, and the prescribing clinician can see it was substituted (not that their original order was silently fulfilled as written).

**US-PHR-05** — As a pharmacist selling an over-the-counter item to a walk-in with no linked prescription, I want a Schedule H/H1 prompt requiring prescriber details when the item requires one, so that the clinic doesn't inadvertently violate dispensing regulations.
- PRD refs: FR-PHR-06
- Priority: P1
- Acceptance criteria: given a Schedule H1 drug is added to a walk-in sale with no linked Rx, the system blocks checkout until prescriber name/registration is captured.

### Epic: GST invoicing

**US-PHR-06** — As a pharmacist closing a sale, I want a GST-compliant tax invoice with HSN, correct CGST/SGST/IGST split, MRP-vs-rate, and gapless per-store invoice numbering, so that the pharmacy is statutorily compliant without manual tax calculation.
- PRD refs: FR-PHR-07
- Priority: P1
- Acceptance criteria: given a sale spanning two GST rates, the invoice correctly splits tax per line; invoice numbers are gapless per `(store_id, financial_year)`, matching the same sequence-table-with-row-locking pattern the PRD specifies for the clinical billing module (`PRD §14.2`).

### Epic: Purchasing and transfers

**US-PHR-07** — As a pharmacist, I want to raise a purchase order, receive goods against it with batch/expiry capture, and process returns/credit notes, so that incoming stock is tracked from order to shelf.
- PRD refs: FR-PHR-08
- Priority: P1
- Acceptance criteria: given a GRN is recorded against a PO, stock increases by the received quantity with the captured batch/expiry, and any discrepancy between ordered and received quantity is visible, not silently reconciled.

**US-PHR-08** — As a Branch Manager, I want to transfer stock between stores with an in-transit state requiring acceptance at the destination, so that a transfer can't silently vanish or duplicate.
- PRD refs: FR-PHR-09
- Priority: P1
- Acceptance criteria: given a transfer is initiated, stock decrements at the source immediately and sits `in_transit` until the destination explicitly accepts it, at which point it increments there.

### Epic: Expiry, reorder, and audit

**US-PHR-09** — As a pharmacist, I want a near-expiry report and reorder-level alerts, so that I catch stock about to expire or run out before it becomes a loss or a stockout.
- PRD refs: FR-PHR-10
- Priority: P1
- Acceptance criteria: given a batch crosses the configured near-expiry horizon, it appears on a daily digest report; a product below its reorder level triggers an auto-suggested PO line.

**US-PHR-10** — As a pharmacist, I want to run a physical stock audit with variance capture and approval-gated adjustment, so that the system's stock figure can be reconciled to the physical shelf count with accountability.
- PRD refs: FR-PHR-12
- Priority: P1
- Acceptance criteria: given a cycle count reveals a variance, the adjustment requires an approver and a reason before the stock ledger is corrected — never a silent overwrite.

**US-PHR-11** — As a pharmacist, I want to export the Schedule H/H1 dispensing register and, if licensed, the narcotics register, so that a statutory inspection can be satisfied directly from the system.
- PRD refs: FR-PHR-11
- Priority: P1
- Acceptance criteria: given a date range, the export contains every regulated dispense in that window with the fields a state drug inspector expects, plus the store's drug licence number on the invoice footer.

## Data model impact

Following `PRD §14.1`'s abridged model, adapted to this schema's conventions:

- `Store`: `id`, `branch_id`, `name`, `licence_no`.
- `Batch`: `id`, `store_id`, `product_id`, `batch_no`, `expiry`, `qty`, `mrp`, `purchase_rate`.
- `StockLedger`: `id`, `store_id`, `product_id`, `batch_id`, `txn_type`, `qty_delta`, `ref_type`, `ref_id`, `at` — an append-only ledger, never a mutated balance column, so every movement is auditable.
- `Dispense`: `id`, `prescription_id|null`, `store_id`, `patient_id`, `items_json`, `invoice_id`, `dispensed_by`.
- `PurchaseOrder`/`GoodsReceiptNote`/`StockTransfer` tables per the standard purchase-to-shelf flow.

## Non-functional notes

The append-only `StockLedger` design is deliberate and should not be "simplified" into a mutated balance field during implementation — the PRD's own emphasis on statutory registers and audit-quality stock records depends on every movement being individually reconstructable.

## Open questions

None raised in PRD §19 specific to this module.
