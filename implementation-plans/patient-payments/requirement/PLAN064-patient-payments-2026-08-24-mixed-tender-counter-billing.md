---
id: PLAN064
type: requirement
feature: patient-payments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ023
related: [REQ004, REQ040, REQ047]
---

# PLAN064 — Implementation plan: mixed-tender counter billing (scoped subset of US-BIL-01)

## Scope correction from research

Two of `REQ023`'s named P0 items are already done, contrary to its own
2026-08-22 "current state" section (written before later sessions closed
them):

- **`US-BIL-09`** (GST fields on `AppointmentPayments`) — shipped by
  `REQ047` (2026-08-23): `gstin`/`hsn_sac_code`/`gst_rate`/`cgst_amount`/
  `sgst_amount`/`igst_amount`/`place_of_supply`/`invoice_number` all real,
  wired from `Products.hsn`/`is_tax_exempt`, plus a real gapless per-clinic
  `InvoiceSequences` table. Reused (not rebuilt) via
  `invoiceDetailsForSuccess()` in this slice's new mutation.
- **`US-BIL-08`** ("fix `createRazorpayOrder`'s missing auth check") — a
  live finding (`project-plans` F-07), but already reviewed and
  deliberately NOT fixed as a blanket auth requirement: `@Public()` stays
  on purpose because the anonymous public-booking wizard
  (`booking/index.jsx`, `BUG011`) legitimately calls this before any
  authentication exists. The real mitigation already shipped is a
  `@Throttle` decorator plus the full webhook + signature-verification +
  reconciliation pipeline (`REQ040`). **Not touched** — re-adding a blanket
  auth check would regress a previously-fixed real bug.

What's genuinely open: `US-BIL-01`'s mixed-tender concept, confirmed fully
greenfield (zero existing `tender`/`payment_method`/`cash` concept
anywhere, by grep, before this slice). Scoped down from the requirement
doc's fuller "compose a bill from services rendered and products
dispensed" (a multi-item Bill/BillLine concept) to: a single appointment's
payment closed by a front-desk-recorded split across cash/UPI/card/cheque
tenders, as an alternative to the existing Razorpay-online-only path.
`US-BIL-02` (UPI-QR auto-detect) and `US-BIL-03` (discount-with-approval)
are explicitly deferred, not silently dropped.

## Design

New `PaymentTenders` — line items under one `AppointmentPayments` row.
A payment row with `PaymentTenders` (vs. one with `razorpay_payment_id`
set) is how the two payment sources are distinguished, matching this
table's own existing convention of distinguishing payment shape by which
nullable fields are populated rather than a separate discriminator column.

`recordCounterPayment` reuses `resolveServicePrice()` (Slice 4,
`channel: 'walkin'` — a counter payment IS the walk-in channel by
definition, the same reasoning `createRazorpayOrder` already applies for
`'online'`) and `invoiceDetailsForSuccess()` (`REQ047`, unchanged) rather
than re-deriving either. Tenders must sum to exactly the resolved amount
due — no partial/underpaid close in this first slice (a `US-BIL-*` P1
concern, correctly deferred, not attempted here).

Gated `@Auth('staff', 'manager', 'admin', 'super_admin')`, not `@Public()`
— unlike `createRazorpayOrder`/`verifyRazorpayPayment`, there is no
anonymous-caller precedent to preserve for a front-desk operation.

## Files touched

- `backend/prisma/schema.prisma` — new `PaymentTenders` model;
  `AppointmentPayments`/`Users` gain the reverse relations.
- `backend/prisma/migrations/20260824080000_mixed_tender_counter_billing/`
  (new).
- `backend/src/appointment-payments/{dto/appointment-payment.input.ts,
  entities/appointment-payment.entity.ts,appointment-payments.service.ts,
  appointment-payments.resolver.ts,appointment-payments.service.spec.ts}` —
  `RecordCounterPaymentInput`/`PaymentTenderInput`,
  `RecordCounterPaymentResultType`, the `recordCounterPayment` service
  method + resolver mutation, 7 new unit tests (nonexistent/cross-org
  appointment, unpriced product, under/over-sum rejection, a successful
  multi-tender split creating one audit-trail row per tender, the
  `'walkin'`-channel price resolution).
- `frontend/src/graphql/mutations.js` — `RECORD_COUNTER_PAYMENT_MUTATION`.
- `frontend/src/pages/appointments/detail.jsx` — new "Take Payment" action
  (staff/manager/admin/super_admin, gated on the appointment having a
  priced service) opening an inline dialog: per-tender type/amount/
  reference rows, a running total vs. amount-due, submit disabled until
  they match exactly. Built here rather than `finances/index.jsx` — a
  per-appointment action fits this page's existing Actions panel
  (Complete/No-Show/Reschedule all already live there) more naturally than
  the billing-history list page, and `APPOINTMENT_FIELDS`'s existing
  `service { price }` field (already resolved through
  `resolveServicePrice()` by Slice 4) was already available here with no
  new query needed.

## Test plan

See `TP091`.

## Test results

Deferred to the end-of-pass consolidated verification run across all five
slices — see `TR090` once that run completes.
