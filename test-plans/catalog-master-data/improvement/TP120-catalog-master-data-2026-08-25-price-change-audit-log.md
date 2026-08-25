---
id: TP120
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN093
related: [REQ066]
---

# TP120 — Test plan for the price-change audit log

## `record-price-change.spec.ts` (new)

| # | Case | Expected |
|---|---|---|
| 1 | `new_price` omitted | Returns `undefined`, no `PriceHistory.create` |
| 2 | `new_price === old_price` | Returns `undefined`, no `PriceHistory.create` |
| 3 | No `effective_from` | Returns new price, row `applied: true` |
| 4 | Past `effective_from` | Treated as immediate, `applied: true` |
| 5 | Future `effective_from` | Returns **old** price, row `applied: false` |
| 6 | `old_price: null` (first-ever price) | Logged as `undefined`, not `null` |

## `price-history-sweep.service.spec.ts` (new)

| # | Case | Expected |
|---|---|---|
| 1 | No due changes | No transaction run |
| 2 | Query shape | `applied: false`, `effective_from: {lte: now}` |
| 3 | A due change | Product price updated, row marked `applied: true` |
| 4 | One transaction fails | Continues to the next change |

## `products.service.spec.ts` / `services.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `update()` with a real price change | `recordPriceChangeIfNeeded` invoked, resolved price written |
| 2 | `update()` with a deferred price | Live row keeps its old price |
| 3 | `update()` with no price field | No `PriceHistory` row |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Real `updateProduct` mutation against the shared "GP Consultation"
fixture — immediate and deferred paths, `priceHistory` read-back,
revert afterward.
