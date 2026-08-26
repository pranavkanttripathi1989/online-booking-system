---
id: CTX-pharmacy-2026-08-26-req125
type: improvement
feature: pharmacy
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ125
related: [PLAN165, TP185, TR185]
---

# pharmacy — REQ125: FEFO default on the dispense batch picker (2026-08-26)

Second slice of the next 10-slice batch (`project-plans/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ125 | [FEFO dispense default](../../requirements/pharmacy/improvement/REQ125-pharmacy-2026-08-26-fefo-dispense-default.md) |
| implementation-plans | PLAN165 | [implementation plan](../../implementation-plans/pharmacy/improvement/PLAN165-pharmacy-2026-08-26-fefo-dispense-default.md) |
| test-plans | TP185 | [verification plan](../../test-plans/pharmacy/improvement/TP185-pharmacy-2026-08-26-fefo-dispense-default.md) |
| test-results | TR185 | [verification results — pass](../../test-results/pharmacy/improvement/TR185-pharmacy-2026-08-26-fefo-dispense-default.md) |

## What shipped

`REQ022`'s own deferred "FEFO suggestions" — turned out half-built
already: the backend's `findBatches()` already sorted earliest-expiry-
first, never credited for it. The real gap was the frontend dispense
dialog leaving the batch picker unselected with no expiry date shown.
Fixed both: default selection to the earliest-expiry batch, expiry date
added to each option's label.

## Verification

Frontend: `eslint` clean on both touched files; pharmacy page test
suite 6/6 (1 new). No backend change.
