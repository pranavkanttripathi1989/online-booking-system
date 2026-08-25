---
id: TR121
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP122
related: [REQ068, PLAN095]
---

# TR121 — Results for payer tariffs (REQ068)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`insurance.service.spec.ts`: 12/12 pass (5 new). Full backend suite (run
once at the end of the batch): **84 suites / 1293 tests**, all passing.
Integration: **4 suites / 369 tests**, all passing. `eslint`: 0 errors.
`tsc --noEmit`: clean.

## Live verification

`setPayerTariff(payer_id: <E2E Star Health>, product_id: <GP
Consultation>, tariff_price: 350)` → confirmed the paise round-trip
(350 rupees in, 350 rupees back on read) and the correct `payer.name`/
`product_name` join via `payerTariffs`. Left in place — new reference
data with zero real billing effect (not wired into `resolveServicePrice()`
by design), matching the "new rows stay" convention for live test
residue.

## Commits

See the commits immediately following this test-results doc in `git log`.
