---
id: CTX-pharmacy-2026-08-25-req059
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ059
related: [PLAN086, TP113, TR112, project-plans/analysis/08-integration-gap-analysis.md]
---

# pharmacy — REQ059, drug catalog + dispense + movement-history UI (2026-08-25, closed same day)

Closes `project-plans/analysis/08-integration-gap-analysis.md` findings A-2 and
A-3 — real, already-tested backend CRUD (`createDrug`/`updateDrug`/
`deleteDrug`) and the pharmacy ledger's own dispense/history operations
(`dispensePrescriptionItem`/`stockMovements`) with zero frontend UI.
`REQ022`'s own three-step design ("receive → dispense → adjust") was
two-thirds built on the frontend before this slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ059 | [drug catalog, dispense, movement-history UI](../../requirements/pharmacy/improvement/REQ059-pharmacy-2026-08-25-drug-catalog-dispense-and-movement-history-ui.md) |
| implementation-plans | PLAN086 | [implementation plan](../../implementation-plans/pharmacy/improvement/PLAN086-pharmacy-2026-08-25-drug-catalog-dispense-and-movement-history-ui.md) |
| test-plans | TP113 | [test plan](../../test-plans/pharmacy/improvement/TP113-pharmacy-2026-08-25-drug-catalog-dispense-and-movement-history-ui.md) |
| test-results | TR112 | [results — all green](../../test-results/pharmacy/improvement/TR112-pharmacy-2026-08-25-drug-catalog-dispense-and-movement-history-ui.md) |

## What shipped

`pages/manager/pharmacy/index.jsx` converted from a single flat
receive/adjust page into three tabs: **Stock** (unchanged), **Drug
Catalog** (new — full CRUD, platform-seeded rows hide edit/delete
matching the backend's own write restriction), **Dispense** (new —
patient search → real prescriptions/items → a batch picker restricted
client-side to the matching drug → `dispensePrescriptionItem`). A new
"History" action on each Stock-tab batch row opens a dialog driven by the
real `stockMovements` query.

A real, additional routing/navigation gap found while implementing (not
in original scope): `/manager/pharmacy` sat under a manager-only
`RoleGuard`, and the sidebar only listed it under the manager-only
collapsible section — real pharmacy staff (`pharmacy.resolver.ts`'s own
`@Auth('staff', ...)`) had no route access and no way to discover the
page. Fixed by moving the route into the existing staff-inclusive guard
block and promoting "Pharmacy" to a top-level nav entry.

## Verification

Full Hard Rule 3 suite green: frontend lint clean (162 warnings, ratchet
held), frontend unit 102/104 (2 pre-existing unrelated
`booking/index.test.jsx` contention-flake failures), build clean,
`check-page-data-wiring.mjs` clean, new e2e spec 3/3 (covering the
route/nav fix, drug creation, and a full real dispense-and-history round
trip). No backend changes. Responsive checked at 360/768/1280/1440px —
the 8-column Drug Catalog table correctly scrolls within its own
`TableContainer` at 360px rather than clipping.

## What this does not close

No per-item "already dispensed" indicator exists — no backend field
tracks it, a real, standing gap not hidden by this slice. Purchase
orders, FEFO suggestions, and GST purchase invoicing remain out of scope,
matching `REQ022`'s own P1 designation for all three.

The remaining findings in `project-plans/analysis/08-integration-gap-analysis.md`
(A-4 through A-10, B-3, B-4) are still open, per that document's own "Fix
sequencing" section.
