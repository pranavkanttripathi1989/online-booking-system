---
id: TR119
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP120
related: [REQ066, PLAN093]
---

# TR119 — Results for the price-change audit log (REQ066)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`record-price-change.spec.ts`: 6/6 pass. `price-history-sweep.service.spec.ts`:
4/4 pass. `products.service.spec.ts`: 43/43 pass (3 new). `services.service.spec.ts`:
27/27 pass (3 new).

Full backend suite: **84 suites / 1293 tests**, all passing
(`npx jest --maxWorkers=2`, 118.6s, run once at the end of the whole
8-slice batch — see this batch's shared verification note). Integration:
**4 suites / 369 tests**, all passing. `eslint`: 0 errors. `tsc --noEmit`:
clean.

## Live verification

Against the real dev stack (`docker restart medibook_backend` confirmed
"Found 0 errors"; schema introspection confirmed `priceHistory` and
`setPayerTariff`-adjacent new fields live before testing):

1. `updateProduct` on the shared "GP Consultation" fixture (₹499→₹599, no
   `effective_from`) — live price became ₹599 immediately; `priceHistory`
   showed one row (`applied: true`).
2. `updateProduct` again (₹599→₹799, `effective_from: 2027-01-01`) — live
   price stayed ₹599; `priceHistory` showed a second row (`applied:
   false`, correct future date).
3. Cleanup: both `PriceHistory` rows deleted and `Products.price` reset
   to 499 via direct SQL (not through the mutation, to avoid adding a
   third audit entry on a fixture other specs depend on).

## Commits

See the commits immediately following this test-results doc in `git log`.
