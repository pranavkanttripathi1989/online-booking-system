---
id: TR076
type: requirement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP077
related: [REQ047, PLAN050]
---

# TR076 — Results: GST fields and invoice numbering

Executed 2026-08-23 in the same isolated worktree as `TR074`/`TR075`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `accepts a correctly-computed signature and marks the payment succeeded` — `invoice_number` matches `/^INV\/\d{4}-\d{2}\/CLINIC-1\/00001$/` |
| TC-02 | pass | `zeroes GST amounts for a confirmed tax-exempt product and copies its HSN` |
| TC-03 | pass | `leaves GST amount fields null for a non-exempt product rather than guessing a rate` |
| TC-04 | pass | `assigns a gapless, incrementing invoice number per clinic via upsert` — mocked `last_number: 7` produces `.../00007` |
| TC-05 | pass | `marks a pending payment succeeded on payment.captured, recording the real payment id` (webhook path) |
| TC-06 | pass | Full suite: Test Suites: 1 passed, Tests: 35 passed, 35 total |
| TC-07 | pass | `npx prisma validate` — "The schema ... is valid" |
| TC-08 | pass | `npx prisma migrate deploy` against `postgres_test` — applied cleanly |
| TC-09 | pass | `npx tsc --noEmit` — 0 new errors (2 pre-existing unrelated errors remain, same as `TR074`/`TR075`) |
| TC-10 | pass | `npx eslint src/appointment-payments` — 0 errors, 0 warnings |
| TC-11 | pass | Covered by TC-06 |

## Notes

- `postgres_test` is now current through migration
  `20260823070000_appointment_payments_gst_and_invoice_numbering` inclusive.
- Confirms a real, previously-dead-code finding: `gstin`/`hsn_sac_code`/
  `gst_rate`/`cgst_amount`/`sgst_amount`/`igst_amount` existed as columns
  on `AppointmentPayments` since `REQ004`/`PLAN012` but had zero write-path
  references anywhere in the codebase before this slice — confirmed via a
  repo-wide grep before starting, not assumed.
