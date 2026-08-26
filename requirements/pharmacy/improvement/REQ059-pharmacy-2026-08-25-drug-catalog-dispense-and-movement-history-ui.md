---
id: REQ059
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ022
related: []
---

# REQ059 — Drug catalog, dispense, and movement-history UI

## Source

`project-plans/analysis/08-integration-gap-analysis.md` findings A-2 and A-3 — a
fresh sweep cross-checking every backend GraphQL operation against real
frontend usage. Both close out real, already-shipped backend capability
from `REQ022`'s own P0 scope that never got frontend UI.

## Current-state gap

**A-2 — no drug master catalog UI.** `backend/src/drugs/drugs.resolver.ts`
has full, tested CRUD (`createDrug`/`updateDrug`/`deleteDrug`, plus a
`is_platform_seeded` distinction gating writes to a tenant's own custom
drugs only). `pages/manager/pharmacy/index.jsx` only ever *reads* the
drug list (`GET_DRUGS`) to populate the receive-stock dropdown. There is
no way, through the app, for a real org to add a drug their clinic starts
stocking — only a direct DB seed can.

**A-3 — the ledger's own "dispense" step and history view are both
missing.** `backend/src/pharmacy/pharmacy.resolver.ts`'s
`dispensePrescriptionItem` (consumes stock against a real
`PrescriptionItems` row, validates the batch's drug matches the
prescribed drug) and `stockMovements` (the append-only ledger's own
read-side history) both exist and are tested. The frontend wires
*receive* and *adjust* only — `REQ022`'s own three-step design ("receive
→ dispense → adjust") is two-thirds built on the frontend; nobody can
record dispensing against an actual prescription through the UI, or see
a batch's own transaction history (only its current running quantity).

## What shipped

All three on the existing `pages/manager/pharmacy/index.jsx`, converted
to a tabbed layout (Stock / Drug Catalog / Dispense) rather than new
routes — keeps the pharmacy domain in one place, matching how
`clinic-forms/index.jsx` already groups related config under tabs:

- **Drug Catalog tab**: table of drugs (name, composition, strength,
  form, schedule class, manufacturer, GST rate), a platform-seeded badge
  (read-only for tenants, matching the backend's own write restriction),
  and a create/edit form. Delete gated the same way.
- **Dispense tab**: patient search (`patients(search)`, the same
  Autocomplete pattern already used elsewhere) → `patientPrescriptions
  (patient_id)` lists their real prescriptions and items (real `id`/
  `drug_id`, not the print view's thinner `PrescriptionPrint` payload,
  which deliberately omits both) → a batch picker restricted to batches
  whose `drug_id` matches the selected item's `drug_id` (mirrors the
  backend's own validation, so a mismatched pick fails client-side before
  the network round trip, not after) → quantity → `dispensePrescriptionItem`.
- **Movement History**: a "History" icon on each Stock-tab batch row
  opens a dialog driven by `stockMovements(batch_id)` — type, quantity
  delta, reference, notes, timestamp, newest first.

## User stories

- As a pharmacy manager, I can add a new drug my clinic has started
  stocking, without needing a database seed.
- As pharmacy staff, I can record dispensing a prescribed drug against a
  specific patient's prescription, decrementing the correct batch's stock
  and leaving a real, attributable audit trail.
- As a pharmacy manager, I can see a batch's full history — every
  receipt, adjustment, and dispense — not just its current count.

## Acceptance criteria (Given/When/Then)

- **Given** a manager on the Drug Catalog tab, **when** they submit a new
  drug, **then** it appears in the Stock tab's receive-stock dropdown
  immediately (real `createDrug`, no mock).
- **Given** a platform-seeded drug, **when** a tenant views it, **then**
  edit/delete are unavailable — matching the backend's own
  `ForbiddenException`.
- **Given** a patient with a real prescription, **when** staff dispense
  one of its items against a compatible batch, **then** that batch's
  `quantity_remaining` decrements by the dispensed amount and a
  `dispense`-type movement row is created, attributed to the real
  `prescription_item_id`.
- **Given** a batch, **when** its History dialog is opened, **then**
  every real movement (receipt/adjustment/dispense) for that batch is
  listed, not just the current count.

## Traceability

`REQ022` (Phase 1 P0, "receive → dispense → adjust") — this closes the
frontend half of that three-step design; the backend half already
shipped. No new `FR-*` scope — this is UI completion for
already-specified backend capability, matching this project's own
"backend created, frontend not integrated" gap-fix pattern (`BUG021`/
`BUG023`'s own precedent).
