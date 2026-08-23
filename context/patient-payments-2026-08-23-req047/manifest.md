---
id: CTX-patient-payments-2026-08-23-req047
type: requirement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ047
related: [REQ023, REQ040, PLAN050, TP077, TR076]
---

# patient-payments — REQ047, GST fields and invoice numbering (2026-08-23)

Second vertical slice of `REQ023`, after `REQ040` (webhook/reconciliation/
throttling). Closes exactly the gap `REQ040`'s own manifest named as out of
scope: *"GST invoicing on webhook-confirmed payment — no invoicing module
exists."*

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ047 | [GST fields and invoice numbering](../../requirements/patient-payments/requirement/REQ047-patient-payments-2026-08-23-gst-fields-and-invoice-numbering.md) |
| implementation-plans | PLAN050 | [implementation](../../implementation-plans/patient-payments/requirement/PLAN050-patient-payments-2026-08-23-gst-fields-and-invoice-numbering.md) |
| test-plans | TP077 | [test plan](../../test-plans/patient-payments/requirement/TP077-patient-payments-2026-08-23-gst-fields-and-invoice-numbering.md) |
| test-results | TR076 | [results](../../test-results/patient-payments/requirement/TR076-patient-payments-2026-08-23-gst-fields-and-invoice-numbering.md) |
| test-suggestions | — | skipped — a status-transition side-effect on an already-proven, already-tested payment flow |

## What this closes

`REQ023`'s US-BIL-09. Day-end cash close, revenue-share/payout,
corporate-credit billing, and the settlement-reconciliation console remain
unbuilt, larger scope each.

## Real finding made while building this (not assumed)

A repo-wide grep before starting confirmed `gstin`/`hsn_sac_code`/
`gst_rate`/`cgst_amount`/`sgst_amount`/`igst_amount` had been live columns
on `AppointmentPayments` since `REQ004`, with **zero** write-path
references anywhere in the codebase — always null on every real row. This
slice is the first code to ever populate them.

## Notable limitation, logged not silently dropped

`gstin` and `place_of_supply` remain unpopulated (no org-level GSTIN
column, no `Clinics.state` column to derive place-of-supply from), and a
non-exempt item's GST rate/amounts stay `null` rather than a guessed
default — see `REQ047`'s own "what this does not do" for the full
reasoning. A unit test pins the non-exempt null-out as intended behavior.
