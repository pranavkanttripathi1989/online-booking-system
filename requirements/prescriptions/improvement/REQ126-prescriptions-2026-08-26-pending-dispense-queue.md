---
id: REQ126
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ021
related: [PLAN166, TP186, TR186]
---

# REQ126 — Pending-dispense queue across the whole pharmacy (US-RX-09)

## Why this slice

`REQ021`'s own doc named US-RX-09 (pharmacy dispense-queue handoff) as
"blocked on `REQ022` not existing yet." `REQ022` (pharmacy) shipped
since (`REQ059`/`REQ067`), so this is the unblocked follow-through, not
a new discovery. Confirmed the real gap before scoping: pharmacy
staff's only way to find what needs dispensing was to search for a
specific patient first, then scan their prescriptions one at a time —
no way to see what's outstanding across the whole pharmacy at a glance,
the actual "queue" the story asks for.

## User story

As pharmacy staff, I can see every prescription item that hasn't been
fully dispensed yet across all patients, oldest first, and dispense
directly from that list without first having to know or search for the
specific patient.

## Acceptance criteria

- **Given** a prescription item with `qty` set and less than `qty`
  dispensed so far, **then** it appears in the pending queue.
- **Given** an item that has been fully dispensed (dispensed quantity
  `>= qty`), **then** it does not appear.
- **Given** the queue, **then** it is ordered oldest-prescription-first.
- **Given** a row in the queue, **then** staff can dispense directly
  from it (pre-filled batch — reusing `REQ125`'s FEFO default — and
  quantity defaulted to what's still remaining), without navigating
  through patient search first.
- **Given** the caller's own org, **then** the queue is scoped to it —
  no cross-tenant visibility.

## In scope

- `pendingDispenseItems` query, aggregating dispensed quantity per item
  from the existing `StockMovements` ledger (no new column — dispensing
  has always been tracked there, not on `PrescriptionItems` itself).
- A "Pending Dispense" tab on `manager/pharmacy/index.jsx`.

## Deliberately out of scope

- SOS ("as-needed") prescription items — these have no fixed `qty`
  (`PrescriptionItems.qty` is nullable specifically for this case) and
  so have no well-defined "remaining" to queue on; excluded via the
  `qty: {not: null}` filter, not silently mis-handled.
- A per-clinic filter on the queue — the existing dispense flow doesn't
  clinic-filter either; kept consistent rather than adding asymmetric
  scope.
