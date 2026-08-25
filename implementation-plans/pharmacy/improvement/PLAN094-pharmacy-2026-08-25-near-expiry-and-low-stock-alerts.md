---
id: PLAN094
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ067
related: []
---

# PLAN094 — Implementation plan for near-expiry/low-stock alerts

## Schema

`Drugs.reorder_level Int?` (nullable, matching CLAUDE.md Hard Rule on
never adding an unnecessary constraint — most drugs have no threshold
configured and that's a valid, permanent state, not a migration-pending
one). `NotificationEventType` gained `low_stock_alert` via a standalone
single-statement migration (`ALTER TYPE ... ADD VALUE`, matching the
documented `break_glass_requested` precedent — Postgres rejects an enum
addition inside a multi-statement transaction with other DDL).

## Changes

**`pharmacy.service.ts`**: `nearExpiryBatches(clinicId, horizonDays,
user)` — `orgScope` plus `quantity_remaining: {gt: 0}`,
`expiry_date: {lte: cutoff}`, `include: {drug: true}` for the name.
`lowStockDrugs(clinicId, user)` — fetches drugs with `reorder_level` set,
then `drugBatches.groupBy({by: ['drug_id'], _sum: {quantity_remaining}})`
scoped to those drug ids, and filters in application code (a `HAVING`-
style filter on a derived sum isn't expressible as a single Prisma
`where`).

**`notification-trigger.service.ts`**: `DEFAULTS` map gained
`low_stock_alert: {app: true, email: true, sms: false, whatsapp: false}` —
the same internal-ops profile as `break_glass_requested`.

**`low-stock-sweep.service.ts`** (new): for each low-stock drug, looks up
`admin`/`manager` `UserProfiles` in the drug's org, and for each one
checks `Notifications.findFirst` for a same-titled row created today
before dispatching — the same-day dedup guard.

**`pharmacy.module.ts`**: `ScheduleModule.forRoot()` + registered
`LowStockSweepService`.

**`drugs.input.ts` / `drug.entity.ts`**: `reorder_level` added
(`@IsInt() @Min(0)`).

## Testing (see `TP121`)

`pharmacy.service.spec.ts` extended (6 new cases across both queries).
`low-stock-sweep.service.spec.ts` (new, 6 cases — including "zero
matching batches treated as zero stock, still notifies" and "continues
to the next recipient if one dispatch fails").

## Live verification

`nearExpiryBatches(horizon_days: 365)` against the real dev DB returned a
real seeded Paracetamol batch expiring 2027-06-01. `lowStockDrugs`
returned `[]` (no dev drug has a `reorder_level` configured yet) —
correct, not a bug; the query's own unit tests cover the non-empty case
directly.
