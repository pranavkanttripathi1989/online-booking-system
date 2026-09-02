---
id: REQ182
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: [REQ180, REQ181]
---

# In-patient department (IPD) slice 4: billing ledger, room-day accrual, package settlement

## Source

Continuation of the approved, `ExitPlanMode`-confirmed 5-slice IPD plan
(`REQ179`'s own source note) — slice 4 of 5. Driven by a bare `continue`
after slice 3 (`REQ181`) shipped, tested, documented, and was pushed, per
the working loop's own resumption protocol. Interrupted once mid-slice by
a Docker daemon lockup ("restart docker app"), recovered via the
established full quit/relaunch pattern with zero data loss, then resumed.

## What this ships

- **`IpdBills`/`IpdCharges`/`IpdPayments`** — the ledger itself.
  `IpdCharges` is append-only with a signed `total_paise`: a reversal is a
  new negative-amount row, never a deletion or an in-place edit.
  `IpdBills.gross_paise`/`paid_paise` are maintained running totals kept
  atomic with every charge/payment write by funnelling through exactly one
  service method, `IpdBillingService#postCharge()` — no call site anywhere
  in the codebase writes `prisma.ipdCharges.create()` directly.
- **`IpdPackages`/`IpdPackageInclusions`** — hospital-defined package
  rates (not government-scheme catalogs, per the plan's own confirmed
  scope). Settlement posts **one signed `package_adjustment` charge row**
  at finalize time rather than switching the bill's own mode, so the
  itemized ledger always accrues in full regardless of `billing_mode` and
  the core invariant (`gross_paise = SUM(charges)`) holds everywhere with
  no branch.
- **Room-day and nursing accrual, cron + on-read catch-up** —
  `RoomDayAccrualService` runs hourly (`@Cron`) as the optimisation, and
  the exact same `accrueForAdmission()` method runs again on every
  `admissionIpdBill` read as the correctness guarantee, matching the
  plan's own explicit design axiom that a cron-only or discharge-only
  design is disqualified. Idempotency is a database property (two partial
  unique indexes Prisma's schema DSL cannot express directly), not an
  application-level check.
- **Day-boundary billing policy as data, not code** —
  `IpdBillingSettings.day_boundary_mode` (`calendar_day`/`rolling_24h`),
  `discharge_cutoff_hour`, `charge_admission_day`/`charge_discharge_day`,
  `transfer_day_rate_policy` (`higher_of`/`new_ward`/`old_ward`),
  `package_excess_policy` (`bill_extra`/`absorb`) — every hospital's own
  argument about how a stay's boundary days bill is a column, not a
  conditional.
- **Automatic charge posting from every domain that already produces a
  billable event**, each through the one funnel: a doctor's round note
  (`nursing.service.ts`, one per clinician per day), a given medication
  dose with a real stock batch (`mar.service.ts`, priced off the batch's
  own MRP — drugs have no Products-catalog link, matching the pre-existing
  dispense-flow precedent), OT theatre usage on `completeOtBooking`
  (`ot-bookings.service.ts`), and an OT consumable recorded against a real
  batch (`ot-consumables.service.ts`). Each has a stated fail-safe: no
  configured charge item means the charge simply never posts, never a
  guessed price.
- **The first real call site wiring `PayerTariffs` into an actual charge,
  not just a read-only quote** — bed/nursing/OT/doctor-visit tariffs are
  real `Products` rows (slice 1's own decision), so
  `resolveServicePrice()`'s existing payer-tariff tier now changes a real
  posted charge with zero new pricing code.
- **Frontend** — `pages/ipd/IpdBilling.jsx`, desktop-dense tier: a
  clinic-scoped bill list with a status filter, a detail dialog (charges
  ledger with per-line reversal, payments list, package selection,
  finalize/unfinalize), manual-charge posting, tender-split payment
  recording, package management (CRUD + a Products inclusion picker), and
  a billing-settings dialog for every column in `IpdBillingSettings`. A
  new "Billing" action on the admissions detail dialog deep-links in via
  `?admission=<id>`, and a top-level nav entry (`ReceiptLongIcon`)
  matches the Operation Theatre precedent.

## Reuse decisions (do not rebuild)

- `nextDocumentNumber()`/`DOCUMENT_SERIES` — the `IPD_BILL`/`IPD_RECEIPT`
  series were pre-reserved in slice 1, used here for the first time for
  gapless `bill_number`/`receipt_number` allocation.
- `resolveServicePrice()` (branch override → payer tariff → category →
  channel) — the full chain, not reimplemented.
- `BranchOverridesService.getForPricing()` — injected for the
  branch-override tier.
- The stock-consumption transaction shape, now replicated a third time
  (`pharmacy.service.ts` → `mar.service.ts` → `ot-consumables.service.ts`)
  — decrement `DrugBatches.quantity_remaining`, write an append-only
  `StockMovements` row.
- Tenant scoping via `orgScope`/`assertSameOrg`/`orgIdForWrite` throughout.
- The `EntitlementGuard`/`@RequiresFeature('ipd')` gate on every mutation,
  reads ungated, matching every prior IPD slice.

## Deliberately NOT built in this slice (recorded, not silently dropped)

- TPA cashless (pre-authorization, enhancement, claim reconciliation) —
  slice 5, the final slice in the plan's own core-first sequencing.
- Government-scheme package catalogs (PMJAY/CGHS) — the plan's own
  confirmed scope is hospital-defined packages only.
- ICU ventilator/infusion flowsheets — out of scope per the plan's own
  confirmed charting-depth decision (slice 2).

## Acceptance criteria

**US-IPD-13**: As a billing clerk, the bill's displayed total always
equals the real sum of the ledger, including after a reversal.
- Given a manual charge posted, then reversed, then a payment recorded,
  when the bill is read, then `gross_paise` equals the unconditional sum
  of every charge row's own `total_paise` (a reversed charge keeps its
  own amount counted; its reversal row's negative amount is what nets it
  to zero) — never a `WHERE is_reversed = false` filter on the sum.

**US-IPD-14**: As a hospital, room and nursing charges accrue correctly
even if the accrual cron is missed for a night.
- Given an admission whose accrual has only ever run once, on-demand,
  several days after admission, when the bill is read, then every
  elapsed day's room-day charge exists exactly once — no gap, no
  duplicate.
- Given the accrual sweep runs 3 times in immediate succession for the
  same admission, when the bill is read, then the charge count is
  identical after each run (idempotent).

**US-IPD-15**: As a billing clerk, selecting a package and finalizing the
bill settles it as one adjustment line, and un-finalizing reverses that
adjustment cleanly.
- Given a package selected and the bill finalized, when read, then
  exactly one signed `package_adjustment` charge exists and every
  matched charge is flagged `is_package_inclusive`.
- Given that finalized bill is un-finalized, when read, then the
  adjustment charge is reversed and the invariant in US-IPD-13 still
  holds.

**US-IPD-16**: As a payer-tariff administrator, a tariff set against a
bed/nursing/OT/doctor-visit product changes the resulting charge with no
new pricing code anywhere.
- Given a `PayerTariffs` row against the ward's bed product, when a
  room-day charge is posted for an admission under that payer, then the
  charge's `unit_price_paise` matches the tariff, not the base price.

**US-IPD-17**: As a billing clerk, a bill number is assigned exactly once
per finalized bill, with no gaps and no collisions, even under
concurrency.
- Given 8 bills finalized concurrently, when read, then all 8
  `bill_number`s are distinct and gapless within the series.

## Data model impact

New: `IpdBills`, `IpdCharges`, `IpdPayments`, `IpdPackages`,
`IpdPackageInclusions`. Altered: `IpdBillingSettings` gained
`doctor_visit_charge_product_id` (nullable); `OperationTheatres` gained
`usage_charge_product_id` (nullable); `IpdCharges.posted_by_user_id` made
nullable in a follow-up migration (a system-posted accrual charge has no
human actor). See `PLAN251` for full field lists and the migration SQL,
including the real ledger-invariant bug found and fixed during this
slice.

## Verification

Backend: 47 new/updated unit tests (`ipd-billing.service.spec.ts` 30,
`room-day-accrual.service.spec.ts` 8, plus 9 new cases across the 4
call-site specs that now post charges). Full suite: 164 suites/2584 tests
(up from 162/2537). New `ipd-billing.int-spec.ts`, 5/5 gates against real
Postgres — including the invariant assertion that caught a real bug (see
`PLAN251`). Full integration suite: 12 suites/502 tests (up from 488).
`tsc`/`eslint` clean throughout. Live schema introspection confirmed
every new query/mutation genuinely served on first container boot.
Frontend: build/lint/size-limit green (`IpdBilling`'s own lazy chunk
23.4kB/6.3kB gzipped), 2 new tests. See `TR271` for full detail.
