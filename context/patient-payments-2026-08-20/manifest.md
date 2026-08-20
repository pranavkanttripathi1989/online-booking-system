---
feature: patient-payments
date: 2026-08-20
ids: [REQ004]
status: draft
---

# patient-payments — 2026-08-20

Requirement written, grounded in the real `PaymentTransactions` schema (tenant-billing-only, confirmed no relation to Appointments/Patients) and the fully-mocked `finances/index.jsx` (567 lines, hardcoded `TRANSACTIONS`/`CARDS`/`ALL_MONTHLY_REVENUE`). No implementation plan yet — **blocked on real Razorpay sandbox credentials**, per the requirement's own explicit note that `status: done` can't be reached without them. Also has three open questions (model shape, expense-tracking scope, whether saved-cards is in scope) that need a decision before an implementation plan can be written confidently.

## Requirement

- [REQ004 — Patient Payments & Finances — Requirements](../../requirements/patient-payments/requirement/REQ004-patient-payments-2026-08-20-razorpay-and-finances.md) — draft, updated 2026-08-20
