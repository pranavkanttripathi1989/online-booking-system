---
id: CTX-prescriptions-2026-08-26-req126
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ126
related: [PLAN166, TP186, TR186]
---

# prescriptions — REQ126: pending-dispense queue (2026-08-26)

Third slice of the next 10-slice batch (`project-plans/analysis/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ126 | [Pending-dispense queue](../../requirements/prescriptions/improvement/REQ126-prescriptions-2026-08-26-pending-dispense-queue.md) |
| implementation-plans | PLAN166 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN166-prescriptions-2026-08-26-pending-dispense-queue.md) |
| test-plans | TP186 | [verification plan](../../test-plans/prescriptions/improvement/TP186-prescriptions-2026-08-26-pending-dispense-queue.md) |
| test-results | TR186 | [verification results — pass](../../test-results/prescriptions/improvement/TR186-prescriptions-2026-08-26-pending-dispense-queue.md) |

## What shipped

`REQ021`'s own "blocked on REQ022 not existing" note — unblocked, since
`REQ022` shipped. New `pendingDispenseItems` query aggregates
`StockMovements` (never a column on `PrescriptionItems` itself) to find
every not-yet-fully-dispensed item org-wide, oldest-first. A new
"Pending Dispense" tab on `manager/pharmacy/index.jsx` lets staff
dispense directly from the queue — reusing `REQ125`'s own FEFO-default
dispense dialog — without needing to search for the patient first.

## Verification

Backend: 92/92 unit suites, 1480/1480 tests (6 new); integration 4/4
suites, 387/387 unchanged. `tsc --noEmit`/`eslint` clean. Frontend:
pharmacy page suite 7/7 (1 new); `eslint` clean on both touched files.
