---
id: TP043
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: approved
parent: REQ004
related: [PLAN013]
---

# Test plan — `finances/index.jsx` real data (REQ004/PLAN013)

## Unit tests (`backend/src/appointment-payments/appointment-payments.service.spec.ts`, 8 new cases)

`myFinanceTransactions`: scopes to the caller org for a manager; does not scope for a platform-wide caller; converts amount to rupees, composes `patient_name`, and reports `"Razorpay"` as the method.

`myFinanceSummary`: every underlying query (this-month findMany, pending aggregate, succeeded/failed counts, range findMany) scoped to the caller org for a manager, unscoped for a platform-wide caller; `revenue_this_month` correctly sums only this-calendar-month succeeded payments; `pending_count`/`pending_amount`/`succeeded_count`/`failed_count` match a hand-constructed fixture, distinct from `analytics`' revenue metric; `monthly` groups succeeded range payments by month, converted to rupees, in chronological order (not map-insertion order).

## Live verification against the real backend

`myFinanceTransactions` and `myFinanceSummary` queried as `manager@medibook.dev` against the real `AppointmentPayments` rows created during REQ004 slice 1's live verification — every number matched exactly by hand-calculation (1 succeeded ₹499 → `revenue_this_month: 499`; 2 pending × ₹499 → `pending_amount: 998`; `monthly: [{month: "Aug 2026", revenue: 499}]`).

## Browser e2e (Playwright, `frontend/e2e/finances.spec.js`, 5 cases)

Real payment data renders (not the old mock names like "John Doe"); KPI cards show real computed figures with no trace of the old fabricated wallet/credit cards; Revenue Chart tab renders real monthly data with no Total Expenses/Net Profit cards; Payment Methods tab is honestly disabled with an explanatory note, not a fake card list; CSV export still triggers a real download against real data.

## Responsive check

360/768/1280px, all three tabs (Payment History, Revenue Chart, Payment Methods): zero horizontal overflow at every breakpoint (ad-hoc Playwright check, not committed as a permanent spec — matches the pattern used for the settings and admin-policies-communications pages earlier this session).

## Non-goals for this plan

Expense tracking, saved payment methods, refunds — all already-flagged open questions/exclusions, not guessed at.
