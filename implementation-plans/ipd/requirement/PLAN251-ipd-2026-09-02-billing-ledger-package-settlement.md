---
id: PLAN251
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ182
related: [TP271, TR271]
---

# PLAN251 — Implementation plan: IPD slice 4 (billing ledger, room-day accrual, package settlement)

Full design rationale for this slice lives in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) — this
document is the as-built record of what that plan became.

## Migrations (hand-written, applied via `prisma migrate deploy`)

`20260902400000_ipd_billing_core` — `IpdBills` (header + maintained
`gross_paise`/`paid_paise`, nullable `package_id`, nullable-until-finalized
`bill_number`, `status` open|finalized), `IpdCharges` (the ledger —
`charge_type`, `service_date`, optional `product_id`, `quantity`,
`unit_price_paise`, signed `total_paise`, optional GST fields,
`is_reversed`, `is_package_inclusive`, optional `bed_occupancy_id`,
optional `source_reference_type`/`source_reference_id`, nullable
`posted_by_user_id`), `IpdPayments` (`payment_type`, signed
`amount_paise`, `tenders_json`, `receipt_number`), `IpdPackages` +
`IpdPackageInclusions`; plus `IpdBillingSettings
.doctor_visit_charge_product_id` and `OperationTheatres
.usage_charge_product_id` (both nullable FKs to `Products`), and 3 partial
unique indexes for accrual idempotency:

```sql
CREATE UNIQUE INDEX "ipd_charges_room_day_once_per_occupancy_day"
ON "IpdCharges" (admission_id, bed_occupancy_id, service_date)
WHERE charge_type = 'room_day' AND is_reversed = false;

CREATE UNIQUE INDEX "ipd_charges_nursing_once_per_occupancy_day"
ON "IpdCharges" (admission_id, bed_occupancy_id, service_date)
WHERE charge_type = 'nursing' AND is_reversed = false;

CREATE UNIQUE INDEX "ipd_charges_doctor_visit_once_per_clinician_day"
ON "IpdCharges" (admission_id, posted_by_user_id, service_date)
WHERE charge_type = 'doctor_visit' AND is_reversed = false;
```

Prisma's schema DSL cannot express a partial (`WHERE`-qualified) unique
index directly, so these exist only in the raw migration SQL, never as
`@@unique` in `schema.prisma` — idempotency is achieved in
`RoomDayAccrualService`/`nursing.service.ts` by catching the resulting
Postgres unique-violation and swallowing it as a no-op (matched by
constraint name in the error message string, since Prisma does not map
SQLSTATE `23P01`/`23505` to its own error codes).

`20260902410000_ipd_charges_posted_by_nullable` — a follow-up migration
dropping `NOT NULL` from `IpdCharges.posted_by_user_id`: a
cron-originated room-day/nursing accrual charge has no human actor, and
the original schema draft had missed this until the accrual service's
own unit tests made the gap concrete.

Both verified live via `psql \d+ "IpdCharges"`/`"IpdBills"` and a direct
`pg_indexes` query confirming all 3 partial indexes exist exactly as
declared.

## Backend layout

`backend/src/ipd-billing/` — `ipd-billing.service.ts` (the core service:
`getSettings`/`updateSettings`, `priceProductForAdmission()` — the
`PayerTariffs` wiring payoff, `findOrCreateBillForAdmission()`,
`postCharge()` — **the one funnel**, `postManualCharge`, `reverseCharge`,
`recordPayment`, `selectPackage`, `finalizeBill`, `unfinalizeBill`,
`settlePackage()` — private, matches charges against inclusions respecting
`max_quantity` or folds everything under `package_excess_policy:
'absorb'`, `recomputeGross()` — private, see the bug account below, plus
reads and package CRUD), `room-day-accrual.service.ts`
(`RoomDayAccrualService`, `@Cron('0 * * * *') sweep()` and the public
`accrueForAdmission()` on-read entry point, `dayWindows()`/`chooseSegment()`
— private, the transfer-day policy resolution, `postDayCharge()` — private,
the partial-unique-index-violation swallow), `ipd-billing.resolver.ts`
(`READ_ROLES`/`FRONT_DESK_ROLES`/`MANAGER_ROLES` tiers; `admissionIpdBill`
runs `accrueForAdmission()` first, best-effort, before reading),
`ipd-billing.module.ts` (imports `ScheduleModule.forRoot()`,
`EntitlementsModule`, `BranchOverridesModule`).

**Wiring into the four existing charge-producing call sites**, each
requiring the owning module to import `IpdBillingModule`:
`nursing/mar.service.ts` (`consumeStock()` now returns
`{stockMovementId, mrpPaise}`; a new private `postPharmacyCharge()` called
from both `administer()` and `recordPrn()` when `status === 'given'` and a
real batch was used, inside the same transaction), `nursing/nursing
.service.ts` (a new private `postDoctorVisitCharge()` called from
`createAdmissionNote()` when `note_kind === 'doctor_round'` and the caller
has a `clinician_id`), `operation-theatre/ot-bookings.service.ts` (a new
private `postUsageCharge()` called from `complete()` after the status
update, priced via the theatre's own `usage_charge_product_id`, dated to
the booking's own `start_at`), `operation-theatre/ot-consumables
.service.ts` (`record()` now posts an `ot_consumable` charge inside the
same transaction when a real batch is used, priced off the batch's own
`mrp_paise` — drugs have no Products-catalog link, so this is priced
directly, not through `resolveServicePrice()`).

## A real financial-invariant bug, found by the integration spec's own assertion

`finalizeBill`/`unfinalizeBill`'s `recomputeGross()` computed
`SUM(charges.total_paise) WHERE bill_id = X AND is_reversed = false` —
excluding reversed charges from the sum entirely. Meanwhile
`postCharge()`/`reverseCharge()`'s own maintained running-total math
(`gross_paise: {increment: delta}`) never excluded anything: a reversal's
own `increment` is always exactly the new reversal row's signed delta,
which implicitly assumes the *original* charge's amount stays counted so
that original+reversal nets to zero. These two definitions of "what
counts in the sum" were inconsistent, diverging by exactly the reversed
charge's own original amount on every reversal.

First observed as a failing `ipd-billing.int-spec.ts` assertion:
`Expected: 95000, Received: 120000` — a ₹1000 room charge + ₹200 nursing
charge (₹1200/120000 paise, the maintained total) versus a real
recomputed sum, after a ₹250/25000-paise manual charge was posted then
reversed, of only ₹950/95000 paise — a discrepancy of exactly 25000, the
reversed charge's own amount.

**Fix**: removed the `is_reversed: false` filter from `recomputeGross()`'s
aggregate query entirely, adopting one consistent invariant everywhere:
`is_reversed` is a display/status flag only, **never** a sum filter — a
reversed charge keeps its own signed amount counted in the sum, and its
reversal row's negative amount is what nets it to zero arithmetically.
This matches the original plan's own literal wording ("signed
`total_paise`, reversal rows never deletions") which never said
"excluding reversed rows". Also fixed the integration test's own
`assertInvariant` helper to match. Re-ran and confirmed all 5 integration
tests pass, and the full 30-test unit spec plus the 8-test accrual spec
still passed unaffected — neither had asserted the old, wrong `WHERE`
clause shape.

## Two test-authoring bugs in the unit spec (fixed before running against real code)

1. The `finalizeBill` test asserted `result.status === 'finalized'`, but
   the real service re-fetches via a separate `findUnique` call after
   `update()` rather than trusting `update()`'s own return value — fixed
   by making the mocked `ipdBills.update` dynamically update what the
   next `findUnique` mock returns, mirroring real read-after-write
   behavior.
2. The `findBillForAdmission` "creates a bill on first read" test only
   chained 2 mock resolutions (`null` then the full bill), but the real
   code path calls `ipdBills.findUnique` **twice** before ever creating
   (once in `findBillForAdmission` itself, once inside
   `findOrCreateBillForAdmission`'s own existence check) — fixed by
   chaining 3 resolutions.

## One test-authoring bug in the accrual spec

The transfer-day test asserted `service_date` should equal the raw
transfer timestamp, but with `discharge_cutoff_hour: 12` the real
day-boundary windows are anchored to noon UTC — the transfer happens
mid-window, so the posted charge's `service_date` is the window's own
start, not the transfer moment. Fixed by asserting the higher-priced ICU
segment was chosen (via `bedOccupancyId`/`productId`) rather than
hand-deriving the exact UTC boundary.

## Frontend

`frontend/src/pages/ipd/IpdBilling.jsx` — desktop-dense tier (verified
1280/1440), page-local `gql`. Top-level nav entry (`/ipd/billing`,
`ReceiptLongIcon`, already imported for Platform Billing) inside the same
`RoleGuard` block as the rest of the IPD surface. A "Billing" action on
`Admissions.jsx`'s detail dialog (visible once an admission has left
`pending`/`cancelled`) deep-links via `?admission=<id>`, matching the
`?bed=`/`?open=` pattern already established in `BedBoard.jsx`/
`Admissions.jsx`. The package-inclusion picker and manual-charge product
picker both reuse the existing unfiltered `products` query
(`manager/products/index.jsx`'s own `GET_PRODUCTS_DATA` contract) rather
than inventing a new one.

## Verification

Backend: `npx tsc --noEmit` and `npx eslint
"{src,apps,libs,test}/**/*.ts"` clean throughout. Full unit suite 164
suites/2584 tests (up from 162/2537). Live schema introspection confirmed
every new query/mutation genuinely served on the first container boot.
Integration: `ipd-billing.int-spec.ts` 5/5 gates pass; full integration
suite 12/12 suites, 502/502 tests (up from 488);
`matrix-coverage.int-spec.ts` green with a new `ipd-billing` `CASES`
entry (`ipdBills`, the `wards`/`operation-theatre` precedent). Frontend:
`eslint` 0 errors (only the pre-existing, accepted `I18N-1` warning
class), `npm run build` and `npm run size` green (`IpdBilling`'s own lazy
chunk 23.41kB/6.33kB gzipped), 2/2 new tests, `Admissions.test.jsx`
(6/6) still green after adding the "Billing" action.
