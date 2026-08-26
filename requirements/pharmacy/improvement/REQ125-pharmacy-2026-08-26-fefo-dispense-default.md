---
id: REQ125
type: improvement
feature: pharmacy
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ022
related: [PLAN165, TP185, TR185]
---

# REQ125 — FEFO default on the dispense batch picker (US-PHR-02)

## Why this slice

`REQ022`'s own P1 scope named "FEFO suggestions" as deferred alongside
purchase orders and GST purchase invoicing. Investigated before scoping:
the backend half of FEFO already existed and was never credited for
it — `PharmacyService#findBatches()` already orders by `expiry_date:
'asc'` (built for `REQ022`'s own batch-listing query). The real gap was
entirely on the frontend: `manager/pharmacy/index.jsx`'s dispense
dialog left the batch dropdown unselected (`dispenseBatchId: ''`) even
though the options it renders are already earliest-expiry-first, and
the dropdown's own label didn't show the expiry date at all, so staff
had no visible cue to pick the right one even if they wanted to.

## User story

As pharmacy staff dispensing a prescription item, the batch with the
earliest expiry date is selected by default, so expiring stock actually
gets used first without me having to remember to check every batch's
date myself — and I can still see the expiry date and change the
selection if I have a real reason to.

## Acceptance criteria

- **Given** a drug with multiple batches in stock, **when** the dispense
  dialog opens for a prescription item, **then** the batch with the
  earliest expiry date is pre-selected.
- **Given** the batch dropdown, **then** each option shows its expiry
  date, not just the batch number and remaining quantity.
- **Given** the default selection, **then** it remains fully overridable
  — staff can still pick a different batch from the dropdown.

## In scope

- `manager/pharmacy/index.jsx`'s `openDispenseForm()` default selection
  and the batch-option label.

## Deliberately out of scope

- Purchase orders, goods-receipt notes, stock transfers, GST purchase
  invoicing — `REQ022`'s own P1 scope, all still correctly deferred,
  none touched here.
- Any backend change — `findBatches()`'s ordering already existed;
  reusing it, not adding to it.
