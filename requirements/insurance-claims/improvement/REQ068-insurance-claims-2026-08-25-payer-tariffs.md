---
id: REQ068
type: improvement
feature: insurance-claims
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ031
related: []
---

# REQ068 — Payer-specific tariff master data

## Source

Part of an 8-slice batch, scoped from `REQ031`'s own `US-INS-02` —
"as a billing admin, I want to record a payer's negotiated rate for a
specific product/service, distinct from the cash price, so a TPA's
tariff is on file for future claims work." This slice was originally
scoped as a different candidate (an org-level notification
sender-identity setting) — that was found redundant during research
(every registered SMS/WhatsApp provider already collects its own sender
identity as a required credential field) and swapped for this one before
any code was written; see this batch's own `PLAN095` for the full
account.

## Current-state gap

`Payers`/`PayerEmpanelments`/`PatientInsurancePolicies` (from `REQ031`'s
own earlier pass) had no concept of a payer's negotiated price for a
specific product — only the org's own cash price existed anywhere.

## What shipped

New `PayerTariffs` model — one row per `(payer_id, product_id)` pair,
`tariff_price` (paise), org-scoped. `payerTariffs(payer_id?, product_id?)`
query and `setPayerTariff(input)` mutation (upsert), both gated
`manager`+. `setPayerTariff` validates the target `product_id` belongs to
the caller's own org (Hard Rule 6) before writing.

**Deliberately not wired into billing.** `resolveServicePrice()` (the
shared price-resolution helper `REQ016` built) is untouched — where a
payer tariff should rank relative to the branch-override/patient-category
layers it already resolves is a genuine open design question, not
guessed at here. This slice builds the master data only; wiring it into
a real charge calculation is its own future, reviewed slice.

## User stories

- As a billing admin, I can record and look up a payer's negotiated rate
  for a specific service, per branch.

## Acceptance criteria (Given/When/Then)

- **Given** a real product in the caller's org, **when** an admin sets a
  tariff for a real payer, **then** `payerTariffs` returns it with the
  price correctly converted from rupees to paise and back.
- **Given** a product belonging to a different org, **when** an admin
  attempts to set a tariff against it, **then** the mutation is rejected
  (Hard Rule 6) and no row is written.
- **Given** an existing tariff for the same `(payer_id, product_id)`
  pair, **when** it's set again, **then** the row is updated in place
  (upsert), not duplicated.

## Traceability

`REQ031` `US-INS-02`. `FR-INS-04` (PRD).
