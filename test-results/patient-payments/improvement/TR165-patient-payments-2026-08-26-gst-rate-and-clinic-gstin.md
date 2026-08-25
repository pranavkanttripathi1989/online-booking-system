---
id: TR165
type: improvement
feature: patient-payments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP165
related: [PLAN141]
---

# TR165 — Test results: GST rate/GSTIN on real appointment payments

## TP165 case outcomes

All 9 cases pass. `appointment-payments.service.spec.ts` gained 4 new
cases (real split, missing-gstin, missing-gst_rate, rounding) alongside
the 2 pre-existing "honest null" tests, both confirmed still passing
unchanged (regression guard for the pre-`REQ101` behavior).
`services.service.spec.ts` and `clinics.service.spec.ts` each gained one
persistence case.

```
PASS src/clinics/clinics.resolver.spec.ts
PASS src/services/services.resolver.spec.ts
PASS src/appointment-payments/appointment-payments-reconciliation.service.spec.ts
PASS src/services/services.service.spec.ts
PASS src/appointment-payments/appointment-payments.service.spec.ts (87 tests)
PASS src/clinics/clinics.service.spec.ts

Test Suites: 6 passed, 6 total
Tests:       151 passed, 151 total
```

`npx tsc --noEmit` — clean.

Frontend: `npx eslint` on the 4 touched files — 0 errors (13 pre-existing
warnings, none new). `manager/services/index.test.jsx` — 4/4 passing
(one pre-existing query-shape fixture fix needed, same class as
`REQ105`'s: the test's own inline `GET_SERVICES_DATA` needed the new
`gst_rate` field to match the component). `manager/clinics/{create,edit}.jsx`
have no existing test suite to extend — the two new fields follow the
exact same generic `set(field)`/spread-into-mutation pattern every other
field on those pages already uses, verified via `eslint`/`tsc` only for
this slice, not a dedicated new test file.

## Full backend suite

`npx jest --maxWorkers=2` (whole codebase, not just touched modules) —
confirms zero regressions anywhere from the `resolveServicePrice()`
signature change (5th optional argument) and the new `Products.gst_rate`/
`Clinics.state`/`Clinics.gstin` columns.
