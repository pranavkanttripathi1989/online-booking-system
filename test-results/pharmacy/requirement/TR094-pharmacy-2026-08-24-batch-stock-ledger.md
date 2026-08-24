---
id: TR094
type: requirement
feature: pharmacy
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP095
related: [REQ022, PLAN068]
---

# TR094 — Results: per-clinic drug batch/stock ledger

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `scopes findBatches to the caller org` |
| TC-02 | pass | `rejects a clinic_id belonging to a different org` |
| TC-03 | pass | `creates a batch and a matching receipt movement, quantity_remaining starts equal to quantity_received` |
| TC-04 | pass | `rejects a cross-org batch` (adjustStock) |
| TC-05 | pass | `rejects an adjustment that would take remaining stock below zero` |
| TC-06 | pass | `applies a valid negative adjustment and logs it` |
| TC-07 | pass | `rejects when the batch drug does not match the prescription item drug` |
| TC-08 | pass | `rejects dispensing more than remains in the batch` |
| TC-09 | pass | `decrements remaining stock and writes a dispense movement linked to the prescription item` |
| TC-10 | pass | New `pharmacy`/`drugBatches` domain-case — matrix + tenancy suites both green |
| TC-11 | pass | `npx tsc --noEmit` — clean |
| TC-12 | pass | `npx eslint` — 0 errors |
| TC-13 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-14 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## Live verification

Not performed this pass — see `TR092`'s environment note (the backend
container became unresponsive to Docker lifecycle commands during this
session's verification window). Deferred to the next session.
