---
id: TP266
type: requirement
feature: patient-payments
created: 2026-09-01
updated: 2026-09-01
status: approved
parent: PLAN246
related: [REQ177]
---

# TP266 — Test plan: reschedule fee, pay-at-clinic, pharmacy payment

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped extension to already-proven booking/pharmacy flows.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `update()` — short-notice reschedule with a prior succeeded payment | New pending fee payment created, surfaced in the response |
| 2 | `update()` — long-notice reschedule | No fee payment created |
| 3 | `update()` — no prior succeeded payment | Fee engine never invoked |
| 4 | `update()` — a cancellation, not a reschedule | Fee engine never invoked, even if `start_datetime` is present |
| 5 | `update()` — `start_datetime` unchanged | Fee engine never invoked |
| 6 | `reschedule_fee_amount` units | Rupees (`Float`), not raw paise (`Int`) |
| 7 | `bookPatientAppointment` — `pay_at_clinic` on a `required`-prepayment service | Rejected |
| 8 | `bookPatientAppointment` — `pay_at_clinic` otherwise | Booking confirmed, no Razorpay order created |
| 9 | `getProducts` (public dialect) | `prepayment_policy` now exposed |
| 10 | `booking/index.jsx` payment step | Real, equal-weight Pay Online/Pay at Clinic toggle; hidden when prepayment required |
| 11 | `recordPharmacyPayment` — cross-org clinic | Rejected |
| 12 | `recordPharmacyPayment` — nonexistent patient | Rejected |
| 13 | `recordPharmacyPayment` — zero-total tenders | Rejected |
| 14 | `recordPharmacyPayment` — real tenders | Paise-summed correctly, `tenders_json` snapshot stored, GST fields left `null` |
| 15 | `manager/pharmacy/index.jsx` | "Collect Payment" action on the Dispense tab, disabled with an explanation when no clinic is selected |
