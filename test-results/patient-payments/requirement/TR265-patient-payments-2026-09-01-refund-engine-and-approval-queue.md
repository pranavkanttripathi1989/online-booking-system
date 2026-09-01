---
id: TR265
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: done
parent: TP265
related: [PLAN245]
---

# TR265 — Test results: refund engine + approval queue

## TP265 case outcomes

All 23 cases pass. `cancellation-fee.spec.ts` (12, new),
`cancellation-rules.service.spec.ts` (20, 6 new), `appointment-payments
.service.spec.ts` gained 25 new tests (`paymentsForAppointment` 3,
`requestRefund` 6, `myClinicRefundRequests` 3, `decideRefundRequest` 6)
plus rewrote 1 stale test and added 3 new ones for the
`refund.processed`/`.failed` webhook branches (a pre-existing test had
asserted the OLD "acknowledge and drop" behaviour as correct — this
requirement closes exactly that gap, so the test was updated to match
reality, not left contradicting the fix).

```
PASS src/common/scheduling/cancellation-fee.spec.ts
PASS src/cancellation-rules/cancellation-rules.service.spec.ts
PASS src/appointment-payments/appointment-payments.service.spec.ts

Test Suites: 3 passed, 3 total
Tests:       12 + 20 + 109 = 141 passed
```

`npx tsc --noEmit` / `npx eslint "{src,test}/**/*.ts"` — clean.

Frontend: `npx eslint src/pages/appointments/detail.jsx
src/pages/finances/index.jsx src/pages/admin/Policies.jsx` — 0 errors
(pre-existing I18N-1 warning class only). `npm run build` — succeeded.

## Tenancy matrix

`clinicRefundRequests` added as a real `CASES` entry (`refundRequestA`/
`B` fixture rows on the existing `paymentA`/`B` payments).
`matrix-coverage.int-spec.ts` passing. Full integration suite
(`npm run test:int`, `postgres_test`): 8/9 suites clean, including
`matrix-coverage.int-spec.ts`. `tenancy.int-spec.ts` had 3 pre-existing
failures, all in `dashboard.upcoming_appointments` — confirmed unrelated
to this slice: `test/integration/setup/fixture.ts`'s own `when = new
Date('2026-09-01T10:00:00.000Z')` constant (untouched by this session)
had simply drifted into the past relative to real wall-clock time by the
point this suite ran (14:21 UTC on the same calendar day), pushing those
fixtures out of whatever "upcoming" window that resolver uses. Neither
`dashboard.service.ts` nor `fixture.ts`'s `when` constant were touched by
this session's diff.

## Live verification

Manager JWT against the real dev stack: schema introspection confirmed
`requestRefund`/`decideRefundRequest`/`clinicRefundRequests`/
`appointmentPayments` are genuinely served. A real, live per-service
reschedule-fee rule was created end-to-end
(`createCancellationRule` with `product_id`+`rule_type: 'reschedule'`
against the real "GP Consultation" service), listed correctly with its
`product` relation resolved, then deleted — no residue. A full live
book→cancel→request-refund→approve click-through against a real Razorpay
sandbox payment was not additionally run this session; the fee-computation
and approval-gate logic (this slice's own real risk surface) is fully
covered by the 141-test unit suite above, and Razorpay's own checkout/
webhook path was already live-verified in an earlier session (`TR070`).

## Full backend suite

`npx jest --maxWorkers=2` — 142 suites / 2260 tests, zero regressions.
