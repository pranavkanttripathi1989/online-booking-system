---
id: TR164
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP164
related: [PLAN140]
---

# TR164 — Test results: payer-tariff pricing wiring

## TP164 case outcomes

All 9 cases pass. `resolve-price.spec.ts` gained a 4-case "payer tariff
(5th argument)" describe block; `insurance.service.spec.ts` gained a
5-case `estimatedPayerCharge` describe block.

```
PASS src/insurance/insurance.service.spec.ts
PASS src/common/pricing/record-price-change.spec.ts
PASS src/common/pricing/resolve-price.spec.ts

Test Suites: 3 passed, 3 total
Tests:       43 passed, 43 total
```

`npx tsc --noEmit` — clean (the new 5th optional parameter on
`resolveServicePrice()` doesn't break any of its 3 existing 4-arg call
sites — verified by the clean typecheck across the whole codebase, not
just this module).

## Scope note

Frontend UI was found to have no existing anchor to attach an "estimate"
action to (`REQ068`'s `PayerTariffs` has zero frontend surface today) —
shipped backend-only, per the correction recorded in `REQ100`'s own doc.
No frontend test needed for this slice.
