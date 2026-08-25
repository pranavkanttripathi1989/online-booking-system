---
id: TP122
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN095
related: [REQ068]
---

# TP122 — Test plan for payer tariffs

## `insurance.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | `findTariffs` | `where` includes `client_org_id` for the caller's org |
| 2 | Row shape | `tariff_price` converted to rupees, `product_name` flattened |
| 3 | Unknown `payer_id` on `setPayerTariff` | Rejected, `BadRequestException` |
| 4 | Cross-org `product_id` | Rejected (Hard Rule 6), `upsert` never called |
| 5 | Valid tariff | `upsert` called with the correct composite key, `tariff_price` converted to paise on both `create` and `update` |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

`setPayerTariff` + `payerTariffs` against the real "E2E Star Health"
payer and "GP Consultation" product.
