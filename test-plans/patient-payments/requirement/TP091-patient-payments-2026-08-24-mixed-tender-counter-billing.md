---
id: TP091
type: requirement
feature: patient-payments
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ023
related: [PLAN064]
---

# TP091 — Test plan: mixed-tender counter billing

Direct test-plan against a well-scoped new mutation reusing two already-
proven helpers (`resolveServicePrice`, `invoiceDetailsForSuccess`) —
suggestion stage skipped per `CLAUDE.md`'s working loop step 4.

## Unit — `appointment-payments.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | Nonexistent appointment | `recordCounterPayment` | `BadRequestException` |
| TC-02 | Cross-org appointment | `recordCounterPayment` | `BadRequestException` ("Appointment not found" — never confirms cross-tenant existence), no write |
| TC-03 | Appointment with no priced product | `recordCounterPayment` | `BadRequestException` |
| TC-04 | Tenders sum to less than the amount due | `recordCounterPayment` | Rejected, no write (no partial close) |
| TC-05 | Tenders sum to more than the amount due | `recordCounterPayment` | Rejected, no write |
| TC-06 | Tenders sum to exactly the amount due, split across cash+UPI | `recordCounterPayment` | Succeeds; one `PaymentTenders` row per tender, each carrying `recorded_by_user_id` |
| TC-07 | A channel-pricing override exists (`walkin` rate) | `recordCounterPayment` | Charges the `'walkin'` rate, never `'online'` |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-08 | `npx prisma validate` | Schema valid |
| TC-09 | `npx tsc --noEmit` | No new errors |
| TC-10 | `npm test` (full suite) | All suites green |
| TC-11 | Frontend `npx eslint src/pages/appointments/detail.jsx` | 0 errors |
| TC-12 | Frontend `npm run build` | Succeeds |

## Live verification against the real dev stack

| Case | Given | When | Then |
|---|---|---|---|
| TC-13 | A real appointment with a priced service | Open its detail page, click "Take Payment", split cash+UPI to match the amount due | Succeeds; the appointment payment shows `succeeded` and an invoice number; `finances/index.jsx` reflects the new transaction |
| TC-14 | Same flow, an intentionally mismatched split | Submit | Rejected with a clear amount-mismatch message, no row created |
