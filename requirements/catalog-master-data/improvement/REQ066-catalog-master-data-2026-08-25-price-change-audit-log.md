---
id: REQ066
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ016
related: []
---

# REQ066 — Price-change audit log with optional deferred effective date

## Source

Part of an 8-slice batch picked up per the established Phase G-series
selection criterion (additive, isolated, no new external vendor
integration), scoped from `REQ016`'s own `US-CAT-05` — "as an org admin,
I want a price change on a Product/Service to be recorded (who, when,
old price, new price), optionally scheduled for a future date, so
pricing changes are auditable and predictable" — which had shipped its
sibling `US-CAT-04` (differentiated pricing) in an earlier pass but left
`US-CAT-05` untouched.

## Current-state gap (re-verified before starting)

`products.service.ts`'s `update()` and `services.service.ts`'s `update()`
both wrote a new `price` straight onto the row with zero audit trail and
zero way to schedule a future change — a price edit today is silent and
immediate, with no record of what it was before or who changed it.

## What shipped

A new shared helper, `common/pricing/record-price-change.ts` —
`recordPriceChangeIfNeeded(prisma, {product_id, client_org_id, old_price,
new_price, effective_from, changed_by_user_id})` — called from both
`products.service.ts#update()` and `services.service.ts#update()` (the
latter writes through the same `Products` table under the hood). It:

- No-ops (no row, no change to the write) when `new_price` is omitted or
  equals the current price.
- With no `effective_from` (or one in the past), writes a `PriceHistory`
  row `applied: true` and returns the new price for the caller's own
  `Products.price` write — an immediate change, audited.
- With a future `effective_from`, writes the row `applied: false` and
  returns the **old** price — the caller's write leaves `Products.price`
  untouched, deferring the actual change to the sweep below.

A new `PriceHistorySweepService` (`@Cron('0 * * * *')`, hourly) finds
`applied: false` rows whose `effective_from` has arrived and applies
them in a `$transaction` (update the product, mark the row applied).

New `priceHistory(product_id)` query on `products.resolver.ts`, backed
by `ProductsService.priceHistory()`, resolving `changed_by_name` from
the row's `changedBy` relation.

## User stories

- As an org admin, when I change a Product/Service price, the old and
  new price, who changed it, and when, are recorded automatically.
- As an org admin, I can schedule a price change for a future date and
  trust it takes effect on that date without further action from me.

## Acceptance criteria (Given/When/Then)

- **Given** a product priced at ₹499, **when** an admin updates it to
  ₹599 with no `effective_from`, **then** the price changes immediately
  and `priceHistory` shows one row (`old_price: 499, new_price: 599,
  applied: true`).
- **Given** the same product, **when** an admin sets a price with a
  future `effective_from`, **then** the live price is unchanged and a
  `priceHistory` row is recorded `applied: false`.
- **Given** an `applied: false` row whose `effective_from` has passed,
  **when** the hourly sweep runs, **then** the product's price updates
  and the row is marked `applied: true`.
- **Given** an `update()` call that does not touch `price` at all,
  **then** no `PriceHistory` row is created.

## Traceability

`REQ016` `US-CAT-05`. `FR-CAT-09` (PRD).
