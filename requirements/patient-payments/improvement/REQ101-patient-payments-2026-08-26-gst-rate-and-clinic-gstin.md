---
id: REQ101
type: improvement
feature: patient-payments
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: —
related: []
---

# REQ101 — Populate GST rate/GSTIN/place-of-supply on real appointment payments

## Why this slice (and a correction to the original premise)

`project-plans/02-findings-register.md` F-17 says `AppointmentPayments` has
no GST fields at all. That is now **stale** — `REQ047` (US-BIL-09) already
added `gstin`, `hsn_sac_code`, `gst_rate`, `cgst_amount`, `sgst_amount`,
`igst_amount`, `place_of_supply`, and `invoice_number` to
`AppointmentPayments`, mirroring `PaymentTransactions`' own shape exactly
(`backend/prisma/schema.prisma`'s own comment on the model says so
verbatim, and `CLAUDE.md`'s Phase G+1 table confirms `US-BIL-09` shipped).
F-17 itself has no status line recording this — this slice adds one.

The real, still-open gap is one layer deeper, and is already flagged
honestly in the code's own comments
(`appointment-payments.service.ts#invoiceDetailsForSuccess`):

> "gst_rate/cgst/sgst/igst are only ever set to real zeros for a
> confirmed-exempt product... a non-exempt item is left with all four
> null rather than guessing a GST rate this schema has nowhere to source
> from (no per-product gst_rate, no org-level GSTIN config table)...
> Logged as an open gap in REQ047, not silently invented."

Confirmed by reading the schema directly: `Products` has `hsn` and
`is_tax_exempt` but no `gst_rate`. `Clinics` has no `state` column at all
(a second, separately-documented gap — see `clinic.input.ts`'s own
comment: "adding a `state` field is a documented follow-up") and no
`gstin` column. The practical effect: **every real, non-exempt
consultation payment today gets an invoice with `gstin`,
`place_of_supply`, and the entire GST split left `null`** — not a GST-
compliant invoice, for the overwhelming majority of real transactions.

## What's in scope

1. `Products.gst_rate Float?` — mirrors `Drugs.gst_rate`'s own existing
   convention exactly (e.g. `18.0` for 18%). Admin-settable via the
   existing `ProductInput` DTO, next to `hsn`/`is_tax_exempt`.
2. `Clinics.state String?` and `Clinics.gstin String?` — the supplier's
   registration state and GSTIN. Admin-settable via `ClinicInput`, next
   to the existing `city`/`postcode` fields.
3. `invoice-payments.service.ts#invoiceDetailsForSuccess()`: for a
   non-exempt product that now has a real `gst_rate` AND a clinic that
   now has a real `gstin` configured, populate `gstin` (from the
   clinic), `place_of_supply` (from `clinic.state`), and split the tax
   as `cgst_amount = sgst_amount = round(amount * gst_rate / 2 / 100)`
   paise (an intra-state assumption — see "deliberately out of scope"
   below), `igst_amount = 0`. When either `gst_rate` or `gstin` is still
   unset (the org hasn't configured them yet), leave the fields `null`
   exactly as today — never guess a rate or a GSTIN.
4. Frontend: a "GST Rate (%)" field on the service/product create-edit
   form (wherever `hsn`/`is_tax_exempt` are already edited), and "State"
   + "GSTIN" fields on the clinic create/edit form, next to the existing
   City/Postcode fields.

## Acceptance criteria

- **Given** a clinic has no `gstin` configured, **when** a patient pays
  for any service, **then** the resulting `AppointmentPayments` row has
  `gstin: null` and `place_of_supply: null` — unchanged from today.
- **Given** a clinic has a `gstin` set and a non-exempt product has a
  `gst_rate` of `18.0`, **when** a ₹1,000 (100000 paise) payment
  succeeds, **then** the row has `gstin` populated, `place_of_supply`
  equal to the clinic's `state`, `cgst_amount: 9000`, `sgst_amount:
  9000`, `igst_amount: 0`.
- **Given** a product is `is_tax_exempt: true`, **when** a payment
  succeeds, **then** all four amounts are `0` regardless of any
  configured `gst_rate` — unchanged from today's existing behavior.
- A platform operator or clinic admin can set/edit a clinic's `state`
  and `gstin`, and a service's `gst_rate`, through the existing
  clinic/service admin forms.

## Deliberately out of scope

- **Interstate CGST+SGST vs. IGST determination.** `Patients` has only a
  flat `address` string, no structured state field — there is no
  reliable "buyer's state" to compare against the clinic's own state.
  This slice assumes every in-person OPD payment is intra-state (the
  overwhelming real-world case for a walk-in/scheduled clinic visit) and
  always splits CGST+SGST, never IGST. A true interstate B2C
  determination is a separate, larger slice needing a structured patient
  address first.
- Renaming `Clinics.postcode` or fixing its `'Europe/London'` timezone
  default — both are separately pre-existing, already-flagged follow-ups
  unrelated to GST.
- GSTR-1/GSTR-3B return-filing exports, e-invoicing (IRN/QR code)
  integration, or any GST-related reporting — this slice is the
  transactional data capture only.
- Retroactively backfilling `gst_rate`/`gstin`/`place_of_supply` on
  historical payment rows — new fields apply going forward only.
