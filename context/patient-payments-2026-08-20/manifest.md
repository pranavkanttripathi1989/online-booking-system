---
feature: patient-payments
date: 2026-08-20
ids: [REQ004, PLAN012, TP042, TR041]
status: in-progress
---

# patient-payments — 2026-08-20

Requirement written, grounded in the real `PaymentTransactions` schema (tenant-billing-only, confirmed no relation to Appointments/Patients) and the fully-mocked `finances/index.jsx` (567 lines, hardcoded `TRANSACTIONS`/`CARDS`/`ALL_MONTHLY_REVENUE`).

The user provided real Razorpay sandbox credentials mid-session, clearing the hard blocker. Real payment **capture** is now built, tested, and live-verified end-to-end against Razorpay's actual sandbox API (PLAN012/TP042/TR041) — see those docs for two real findings made mid-build: the booking flow's payment UI was built against Stripe, not Razorpay (a placeholder key, the wrong vendor per CLAUDE.md, now replaced with real Razorpay Checkout), and the pre-existing `createPaymentTransaction` resolver wrote appointment data into the wrong table (`PaymentTransactions`, tenant-billing-only — removed, replaced by a correctly-shaped new `AppointmentPayments` model).

`finances/index.jsx`'s full rewrite (100% mock, no existing contract — KPIs, revenue/expense chart, saved cards) and the expense-tracking open question (#3) remain a second, not-yet-started slice — status stays `in-progress`, not `done`, until that lands.

## Requirement

- [REQ004 — Patient Payments & Finances — Requirements](../../requirements/patient-payments/requirement/REQ004-patient-payments-2026-08-20-razorpay-and-finances.md) — draft, updated 2026-08-20

## Implementation plan

- [PLAN012 — Real Razorpay payment capture](../../implementation-plans/patient-payments/requirement/PLAN012-patient-payments-2026-08-20-razorpay-capture.md) — done

## Test plan

- [TP042 — Real Razorpay payment capture](../../test-plans/patient-payments/requirement/TP042-patient-payments-2026-08-20-razorpay-capture.md) — approved

## Test results

- [TR041 — Real Razorpay payment capture](../../test-results/patient-payments/requirement/TR041-patient-payments-2026-08-20-razorpay-capture.md) — passed
