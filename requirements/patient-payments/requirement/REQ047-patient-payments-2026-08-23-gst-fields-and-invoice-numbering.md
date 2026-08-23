---
id: REQ047
type: requirement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ023
related: [REQ040]
---

# REQ047 — GST fields and gapless invoice numbering on patient payments

Second vertical slice of `REQ023` (billing depth and revenue share), after
`REQ040` (webhook/reconciliation/throttling — the payment-integrity half).
Targets US-BIL-09.

## Why this slice

US-BIL-09: *"...GST fields (place of supply, HSN/SAC, CGST/SGST/IGST
split, GSTIN) on patient payments the same way they already exist on SaaS
billing... given a patient payment for a taxable item, the resulting
invoice carries correct GST fields and a gapless per-branch invoice
number."* `AppointmentPayments` already had `gstin`/`hsn_sac_code`/
`gst_rate`/`cgst_amount`/`sgst_amount`/`igst_amount` columns (mirrored from
`PaymentTransactions` when the table was first designed) — but a repo-wide
search found **zero** references to any of them anywhere in
`appointment-payments.service.ts` or its webhook controller. They were
live, declared columns that nothing had ever written to — always `null` on
every real row. `place_of_supply` and any invoice number didn't exist at
all.

## What was built

- Migration `20260823070000_appointment_payments_gst_and_invoice_numbering`:
  `AppointmentPayments.place_of_supply`/`invoice_number` (both nullable
  text), and a new `InvoiceSequences` table — one row per
  `(clinic_id, series, financial_year)`, incremented via a single atomic
  `upsert` (Postgres `INSERT ... ON CONFLICT DO UPDATE`), so two concurrent
  payments for the same clinic can never collide or skip a number. `series`
  defaults to `"APPT"` so a future pharmacy invoice stream (`REQ022`) can
  share this table under a different series.
- `AppointmentPaymentsService.invoiceDetailsForSuccess()` — called from
  **both** places a payment can transition to `succeeded`
  (`verifyRazorpayPayment` and the webhook's `payment.captured` branch, so
  whichever delivery lands first is authoritative): assigns a real,
  gapless invoice number every time, and — using `REQ046`'s newly-real
  `Products.hsn`/`is_tax_exempt` — copies the linked product's HSN and, for
  a confirmed-exempt item, writes real zeros to `gst_rate`/`cgst_amount`/
  `sgst_amount`/`igst_amount` (GST-exempt genuinely means zero tax; this
  is a fact, not an invented number).
- `invoice_number` exposed on `FinanceTransactionType`
  (`finances/index.jsx`'s Payment History tab) — the one new field this
  slice adds to an existing read surface, since the Accountant persona the
  AC names needs to actually see the number to reference an invoice.
- 5 new/updated unit tests covering: the invoice number's format and
  per-clinic gaplessness, the exempt-item zeroing, and the deliberate
  non-exempt null-out (see below).

## What this does not do — and why, explicitly

- **`gstin` and `place_of_supply` are still never auto-populated.** There
  is no org-level GSTIN column anywhere in this schema (confirmed by
  searching — the existing `PaymentTransactions` schema comment already
  says so), and `Clinics` has no `state` column to derive place-of-supply
  from (`CLAUDE.md`'s own documented flat-address inconsistency). Inventing
  either would be exactly the kind of guessed business fact Hard Rule 10
  forbids. Both columns exist and accept a real value if one is ever
  supplied through a future admin-settings slice; this one does not add
  that UI.
- **A non-exempt item's `gst_rate`/`cgst_amount`/`sgst_amount`/
  `igst_amount` are left `null`, not defaulted to a guessed rate (e.g.
  18%).** `REQ016`/`REQ046` deliberately did not add a `gst_rate` column to
  `Products` (out of that slice's own scoped data-model impact) — there is
  no real per-product rate anywhere to source from. A unit test
  (`leaves GST amount fields null for a non-exempt product rather than
  guessing a rate`) pins this as the intended behavior, not a gap to
  "helpfully" fill in later without a real rate source.
- No `Shifts`/`CashReconciliation`, `RevenueShareRules`/`PayoutStatements`,
  `CorporateAccounts`, or `SettlementReconciliation` tables — separate,
  larger `REQ023` user stories.
