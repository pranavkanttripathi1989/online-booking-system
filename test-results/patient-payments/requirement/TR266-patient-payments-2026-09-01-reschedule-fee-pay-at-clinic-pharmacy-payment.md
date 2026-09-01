---
id: TR266
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: TP266
related: [PLAN246]
---

# TR266 — Test results: reschedule fee, pay-at-clinic, pharmacy payment

## TP266 case outcomes

All 15 cases pass. `appointments.service.spec.ts` gained a dedicated
`update — reschedule fee` describe block (5 new tests) plus constructor
mocks for the two newly-injected services and an `appointmentPayments`
prisma mock. `pharmacy.service.spec.ts` gained a `recordPharmacyPayment`
describe block (4 new tests).

```
PASS src/appointments/appointments.service.spec.ts (114 tests)
PASS src/pharmacy/pharmacy.service.spec.ts (25 tests)

Test Suites: 2 passed, 2 total
```

`npx tsc --noEmit` / `npx eslint "{src,test}/**/*.ts"` — clean.

Frontend: `npx eslint src/pages/booking/index.jsx
src/pages/manager/pharmacy/index.jsx` — 0 errors (pre-existing I18N-1
warning class only). `npm run build` — succeeded.

## Real bug found and fixed during frontend verification

`booking/index.jsx`'s own Jest suite (`index.test.jsx`) failed 8/8 once
run in isolation, all at the same `waitFor(getByText('Sarah Mitchell'))`
step — the test file duplicates `GET_CLINICIAN_AND_PRODUCTS`'s query AST
for `MockedProvider` matching (a documented, necessary pattern in this
file — a component's real `gql` import can't be reused from a test), and
adding `prepayment_policy` to the real component query without updating
the test's own duplicated copy left the two ASTs mismatched, so
`MockedProvider` never resolved a match and the page stayed loading
forever. A combined 4-suite run had first shown this as apparent
resource-contention flakiness (a different suite failed each run); an
isolated re-run of `booking/index.test.jsx` alone confirmed it was
consistent, not contention. Fixed by adding `prepayment_policy` to the
test's own duplicated query and mock data — 8/8 passing after.

```
PASS src/pages/booking/index.test.jsx (8 tests)
PASS src/pages/settings/index.test.jsx
PASS src/pages/appointments/detail.test.jsx
PASS src/pages/manager/pharmacy/index.test.jsx

Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
```

## Live verification

Manager JWT against the real dev stack: schema introspection confirmed
`recordPharmacyPayment` genuinely served. A live pay-at-clinic booking
click-through and a live reschedule-fee trigger against a real
appointment were not additionally run this session — both are fully
covered by their respective unit suites above, and `frontend/e2e/`'s own
real-backend booking-flow specs were not re-run for this specific new
toggle (a gap, not a claim of coverage).

## Full backend suite

`npx jest --maxWorkers=2` — 142 suites / 2260 tests, zero regressions.
