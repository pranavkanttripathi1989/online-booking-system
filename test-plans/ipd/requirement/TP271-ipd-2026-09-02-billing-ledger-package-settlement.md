---
id: TP271
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN251
related: [REQ182]
---

# TP271 — Test plan: IPD slice 4 (billing ledger, room-day accrual, package settlement)

Suggestion stage skipped, same grounds as `TP268`/`TP269`/`TP270`: this
slice's own full technical design (schema, the ledger invariant, the
accrual idempotency strategy) was reviewed and approved via
`ExitPlanMode` before any code was written.

## `IpdBillingService` cases

| # | Case | Expected |
|---|---|---|
| 1 | `postCharge` on a cross-org admission | Rejected |
| 2 | `postCharge` | Creates the charge row and increments `IpdBills.gross_paise` by the charge's own `total_paise`, atomically |
| 3 | `postCharge` with no existing bill for the admission | Bill auto-created first |
| 4 | `postManualCharge` with a `product_id` | Priced via `resolveServicePrice` |
| 5 | `postManualCharge` with an explicit `unit_price` | Uses the caller-supplied price, no pricing lookup |
| 6 | `reverseCharge` on an already-reversed charge | Rejected |
| 7 | `reverseCharge` | Original marked `is_reversed: true`; a new signed-negative reversal row posted; bill incremented by the reversal's own delta |
| 8 | `recordPayment` with multiple tenders | `tenders_json` persisted, `amount_paise` is the tender sum |
| 9 | `recordPayment` of type `refund` | Signed negative, decrements `paid_paise` |
| 10 | `recordPayment` | `receipt_number` allocated via `nextDocumentNumber`, gapless |
| 11 | `selectPackage` with a package from a different clinic | Rejected |
| 12 | `selectPackage` on an already-finalized bill | Rejected |
| 13 | `finalizeBill` with a package selected | Calls `settlePackage`, posts exactly one `package_adjustment` charge |
| 14 | `finalizeBill` with no package | No adjustment charge; `bill_number` still assigned |
| 15 | `finalizeBill` | `recomputeGross()` sums **every** charge unconditionally (see `PLAN251`'s own bug account) |
| 16 | `finalizeBill` on an already-finalized bill | Rejected |
| 17 | `unfinalizeBill` | Reverses the prior `package_adjustment` charge (if any), un-marks `is_package_inclusive`, recomputes gross |
| 18 | `settlePackage` under `package_excess_policy: 'bill_extra'` | Only inclusion-matched charges (respecting `max_quantity`) flagged inclusive |
| 19 | `settlePackage` under `package_excess_policy: 'absorb'` | Every charge flagged inclusive |
| 20 | `findBillForAdmission` with no bill yet | Auto-creates one, `findOrCreateBillForAdmission`'s own existence check runs before create |
| 21 | `findAll`/`findOne` on a cross-org bill | Rejected |
| 22 | `createPackage`/`updatePackage` with an inclusion product from a different clinic | Rejected |
| 23 | `removePackage` referenced by a live selected bill | Rejected |
| 24 | `priceProductForAdmission` with a matching `PayerTariffs` row | Tariff price wins over base/branch-override/category |
| 25-30 | Reads/writes cross-org rejection matrix across the remaining mutations | All rejected |

## `RoomDayAccrualService` cases

| # | Case | Expected |
|---|---|---|
| 31 | `sweep()` with `auto_post_room_charges: false` | No charges posted |
| 32 | `accrueForAdmission` with no bed occupancy | No-op |
| 33 | `accrueForAdmission` across a single-ward multi-day stay | One `room_day` charge per elapsed day |
| 34 | `accrueForAdmission` | Both `room_day` and `nursing` charges posted per day when both are configured |
| 35 | `accrueForAdmission` with `charge_admission_day: false` | Admission day skipped |
| 36 | `accrueForAdmission` run 3× in immediate succession | Charge count identical after each run (idempotent, partial-unique-index swallow) |
| 37 | `postDayCharge` hitting a genuine (non-duplicate) database error | Re-thrown, not swallowed |
| 38 | A day split across two bed occupancies (transfer mid-day) | `transfer_day_rate_policy` resolves the correct segment/price |

## Live-only checks (not unit-testable against a mocked Prisma client)

- The core invariant, `bill.gross_paise === SUM(charges.total_paise)`,
  asserted after a real manual-charge-then-reversal-then-payment sequence
  against real Postgres — the exact assertion that caught the
  `recomputeGross()` bug documented in `PLAN251`.
- Idempotent room-day accrual across 3 real sweep runs against a live
  admission.
- A stay whose accrual only ever ran once, on-demand, 4 days after
  admission — still produces the correct number of room-day charges with
  no gap.
- A real `PayerTariffs` row against the ward's bed product changing the
  resulting room-day charge's price with zero new pricing code.
- `bill_number` staying gapless and collision-free across 8 bills
  finalized concurrently (`Promise.all`).
- Container boot after schema generation — confirms no `@Args` reflection
  failure (the lesson from `REQ180`/`REQ181`, applied proactively again).
- Live introspection of `Query`/`Mutation` confirming every new operation
  is genuinely served.
- `matrix-coverage.int-spec.ts` — confirms the new `ipd-billing` domain is
  classified.
