---
id: PLAN093
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ066
related: []
---

# PLAN093 — Implementation plan for the price-change audit log

## Schema

New `PriceHistory` model (`backend/prisma/migrations/
20260825110000_phase_g4_batch/migration.sql`): `id`, `product_id` (FK →
`Products`), `client_org_id`, `old_price Int?`, `new_price Int`,
`effective_from DateTime`, `applied Boolean @default(false)`,
`changed_by_user_id` (FK → `Users`), `created_at`. Indexed on
`(product_id, effective_from)` for the sweep's own query, and on
`client_org_id` for tenant-scoped reads.

## Changes

**`common/pricing/record-price-change.ts`** (new, shared, not
duplicated per-domain since `products.service.ts` and
`services.service.ts` both write through `Products`): pure function
taking a `prisma` client and the change parameters, returning either
`undefined` (no-op), the new price (immediate), or the old price
(deferred) — the caller always uses the return value for its own write,
never the raw input, so the deferred case can never leak the not-yet-applied
price into `Products.price`.

**`products.service.ts#update()`**: rewritten to fetch the raw existing
row via `products.findUnique` (not the old `findOne(id, user)`, whose
return was discarded anyway), call `assertSameOrg` directly, call
`recordPriceChangeIfNeeded`, and write `price: resolvedPrice`. Added
`priceHistory(productId, user)`.

**`services.service.ts#update()`**: identical pattern — `Services` has
no `price` column of its own (it lives on the underlying `Products`
row), so this reuses the exact same helper against the exact same
table.

**`products.module.ts`**: added `ScheduleModule.forRoot()` (idempotent —
already imported elsewhere in the app) and registered
`PriceHistorySweepService`.

**`UpdateProductInput`**: gained `effective_from?: string`
(`@IsDateString()`); `ServiceInput` gained the same field, used only on
update.

## Testing (see `TP120`)

`record-price-change.spec.ts` (new, 6 cases — the no-op paths, immediate
vs. deferred, the `old_price: null` first-ever-price case).
`price-history-sweep.service.spec.ts` (new, 4 cases). 3 new cases each
in `products.service.spec.ts` / `services.service.spec.ts` covering the
real call-site integration.

## Live verification

Confirmed over the real GraphQL endpoint against the shared
"GP Consultation" fixture: an immediate change (₹499→₹599) applied at
once with a correct `priceHistory` row; a subsequent deferred change
(₹599→₹799, `effective_from: 2027-01-01`) left the live price at ₹599
and logged `applied: false`. Both `PriceHistory` rows and the price
itself were reverted afterward (direct SQL, not through the mutation, to
avoid adding a third audit entry) — "GP Consultation" is a shared
fixture other specs depend on.
