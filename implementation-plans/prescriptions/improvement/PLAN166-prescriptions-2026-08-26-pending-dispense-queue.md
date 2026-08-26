---
id: PLAN166
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ126
related: [TP186, TR186]
---

# PLAN166 — Implementation plan: pending-dispense queue

## Change

**`backend/src/pharmacy/pharmacy.entity.ts`**: new
`PendingDispenseItemType` (`prescription_item_id`, `prescription_id`,
`issued_at`, `patient_id`, `patient_name`, `drug_id`, `drug_name`,
`dose`, `frequency`, `qty`, `dispensed_qty`, `remaining_qty`).

**`backend/src/pharmacy/pharmacy.service.ts`**: new
`pendingDispenseItems(user)` — loads every `PrescriptionItems` row with
a non-null `qty`, scoped via `orgScopeVia(user, 'encounter')` nested one
level deeper (`prescription: orgScopeVia(user, 'encounter')`, matching
`dashboard.service.ts`'s own established 2-level-nesting precedent, not
a reinvented ternary), ordered by `prescription.issued_at` ascending.
Aggregates dispensed quantity per item via a single `stockMovements
.groupBy()` (avoids an N+1 per item), then filters to items where
`dispensed_qty < qty`.

**`backend/src/pharmacy/pharmacy.resolver.ts`**: new
`pendingDispenseItems` query, same `@Auth('staff', 'manager', 'admin',
'super_admin')` gate as every other pharmacy operation.

**`frontend/src/pages/manager/pharmacy/index.jsx`**: new "Pending
Dispense" tab (lazy-loaded on first open, matching this page's own
on-demand convention). Each row's "Dispense" button opens the existing
dispense dialog directly via a new `openDispenseFromQueue()` — no
patient search needed — pre-filled with `remaining_qty` (not the
item's original `qty`, since some may already be dispensed) and,
per `REQ125`, the earliest-expiring batch. `submitDispense()`'s success
path now also refreshes the pending list when that tab is open.

No `schema.prisma` change — dispensing was always tracked via
`StockMovements`, never a column on `PrescriptionItems`.

## Testing

`backend/src/pharmacy/pharmacy.service.spec.ts`: 6 new cases — org
scoping via the nested `prescription.encounter` relation, full
remaining quantity with nothing dispensed yet, partial-dispense
subtraction, exclusion once fully dispensed, oldest-first ordering, and
a short-circuit that skips the `stockMovements.groupBy` call entirely
when there are no eligible items.

`frontend/src/pages/manager/pharmacy/index.test.jsx`: 1 new case — the
Pending Dispense tab lists an org-wide row, and dispensing directly
from it (no dropdown interaction, matching `REQ125`'s own FEFO-default
test pattern) submits the real mutation with the pre-filled remaining
quantity, then confirms the queue re-fetches to empty.

Full backend unit suite: 92/92 suites, 1480/1480 tests (6 new).
Integration suite: 4/4 suites, 387/387 unchanged (new query on an
already-covered domain, no new tenancy-matrix entry needed). `tsc
--noEmit`/`eslint` clean. Frontend: pharmacy page suite 7/7 (1 new),
`eslint` clean on both touched files.

## Documentation

`REQ126` (this requirement), `PLAN166` (this plan), `TP186`/`TR186`
(verification), a context bundle, and index updates across all five doc
roots plus the `prescriptions` feature README.
