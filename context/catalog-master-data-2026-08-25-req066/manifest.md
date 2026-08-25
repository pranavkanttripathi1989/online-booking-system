---
id: CTX-catalog-master-data-2026-08-25-req066
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ066
related: [PLAN093, TP120, TR119]
---

# catalog-master-data — Price-change audit log (2026-08-25)

One of an 8-slice backend batch. Closes `REQ016`'s own `US-CAT-05`: every
`Products`/`Services` price change is now recorded (old price, new
price, who, when) in a new `PriceHistory` table, with an optional future
`effective_from` deferring the actual change to a new hourly
`PriceHistorySweepService`.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ066 | [Price-change audit log](../../requirements/catalog-master-data/improvement/REQ066-catalog-master-data-2026-08-25-price-change-audit-log.md) |
| implementation-plans | PLAN093 | [implementation plan](../../implementation-plans/catalog-master-data/improvement/PLAN093-catalog-master-data-2026-08-25-price-change-audit-log.md) |
| test-plans | TP120 | [test plan](../../test-plans/catalog-master-data/improvement/TP120-catalog-master-data-2026-08-25-price-change-audit-log.md) |
| test-results | TR119 | [results](../../test-results/catalog-master-data/improvement/TR119-catalog-master-data-2026-08-25-price-change-audit-log.md) |

## What shipped

New shared `common/pricing/record-price-change.ts` helper, called from
both `products.service.ts#update()` and `services.service.ts#update()`
(they write through the same `Products` table). New `priceHistory`
query. Migration: `20260825110000_phase_g4_batch` (the `PriceHistory`
table).

## Live verification

Confirmed both the immediate and deferred paths over the real GraphQL
endpoint against the shared "GP Consultation" fixture; both mutated
state (price, audit rows) reverted afterward via direct SQL.
