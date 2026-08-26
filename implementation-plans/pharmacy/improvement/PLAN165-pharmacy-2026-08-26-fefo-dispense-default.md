---
id: PLAN165
type: improvement
feature: pharmacy
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ125
related: [TP185, TR185]
---

# PLAN165 — Implementation plan: FEFO default on the dispense batch picker

## Change

**`frontend/src/pages/manager/pharmacy/index.jsx`**:

- `openDispenseForm()` now defaults `dispenseBatchId` to
  `matchingBatches(item)[0]?.id` instead of `''` — safe because
  `matchingBatches()` filters the already-server-sorted (`expiry_date:
  'asc'`) `batches` array, so index `[0]` is always the earliest-expiry
  batch with stock for that drug.
- The batch dropdown's option label now includes the expiry date
  (`{batch_number} — exp {date} — {remaining} remaining`), matching the
  Stock tab's own `toLocaleDateString('en-IN')` formatting convention
  already used elsewhere in this file.
- A caption above the dropdown states the default is FEFO and
  overridable, so the pre-selection doesn't look like a bug to a first-
  time user.

No backend change — `PharmacyService#findBatches()`'s `orderBy:
{expiry_date: 'asc'}` already existed from `REQ022`.

## Testing

`frontend/src/pages/manager/pharmacy/index.test.jsx`: new case —
two batches for the same drug supplied in real server order (earliest
expiry first), dispense dialog opened, quantity filled, submitted with
**zero** dropdown interaction, and the resulting `dispensePrescriptionItem`
mutation call asserted to use the earlier batch's id. Re-ran the two
pre-existing Dispense tests unchanged (both still explicitly select a
batch via the dropdown even though there's only one match — harmless,
re-selecting the same already-defaulted value).

Full run: 6/6 tests pass (1 new). `eslint` clean on both touched files
(0 warnings, this file had none before either).

## Documentation

`REQ125` (this requirement), `PLAN165` (this plan), `TP185`/`TR185`
(verification), a context bundle, and index updates across all five doc
roots plus the `pharmacy` feature README.
