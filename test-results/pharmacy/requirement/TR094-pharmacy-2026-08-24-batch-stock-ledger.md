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

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note for the original blocker). Live-tested against
the real dev stack as `manager@medibook.dev`:

- `receiveStock` on the real "Paracetamol" drug at "MG Road Clinic" — 100
  units received, `quantity_remaining: 100`.
- **A real bug found and fixed live**: `adjustStock(quantity_delta: -5)`
  failed with `"property quantity_delta should not exist"` — a
  `BadRequestException` from the global `ValidationPipe`'s
  `whitelist:true`/`forbidNonWhitelisted:true`. `AdjustStockInput.
  quantity_delta` had zero `class-validator` decorators, so the whitelist
  stripped it before it ever reached the resolver — the exact bug class
  `REQ020` first found (a missing decorator silently rejecting a save),
  reachable only by an actual HTTP request through the real
  `ValidationPipe`, not by a mocked-Prisma unit test. Fixed by adding
  `@IsInt()` (no `@Min`/`@Max` — the field is deliberately signed).
  Re-tested live after the fix: `100 → 95`, and `stockMovements` showed
  both the `receipt` and `adjustment` rows with the correct signed deltas.
- The same live-verification pass proactively scanned every other new
  DTO from this session's 8-slice pass for the identical bug class and
  found two more real instances: `Plans.price` (both `PlanInput` and
  `CreatePlanVersionInput`, see `TR092`) and `ScheduledReportInput.
  clinic_id` (see `TR098`). All three fixed together, full suite
  re-confirmed green (73/73 unit, 315/315 integration) after the fix.
- `dispensePrescriptionItem` was not live-exercised — no `Prescriptions`
  rows exist in the current dev-seeded data reachable by the test
  manager account. Covered at the unit level only (`TC-07`–`TC-09`).
