---
id: REQ067
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ022
related: []
---

# REQ067 — Near-expiry batch report and low-stock alerts

## Source

Part of an 8-slice batch, scoped from `REQ022`'s own `US-PHR-09` —
"as a pharmacy manager, I want to see batches nearing expiry and be
alerted when a drug's stock falls below a reorder threshold, so I don't
dispense expired stock or run out unexpectedly." `REQ022`'s own P0 pass
shipped receive → dispense → adjust; this closes the operational-alerting
half explicitly deferred at the time.

## Current-state gap

No query surfaced batches approaching expiry. `Drugs` had no
reorder-threshold concept at all, so nothing could ever compute "low."

## What shipped

`Drugs.reorder_level Int?` (new column, optional — a drug with no
threshold configured is simply never flagged). Two new read queries on
`pharmacy.resolver.ts`: `nearExpiryBatches(clinic_id, horizon_days)`
(batches with `quantity_remaining > 0` expiring within the window) and
`lowStockDrugs(clinic_id)` (drugs with a configured `reorder_level` whose
summed `DrugBatches.quantity_remaining` is at or below it — a drug with
zero matching batches is correctly treated as zero stock, not excluded).

A new `LowStockSweepService` (`@Cron('0 8 * * *')`, daily) dispatches a
`low_stock_alert` notification (app+email, new `NotificationEventType`
enum value) to every admin/manager in the drug's org, deduped per
recipient per day by checking for an identically-titled `Notifications`
row already created today.

## User stories

- As a pharmacy manager, I can see which batches are expiring soon so I
  can prioritize dispensing them or writing them off.
- As a pharmacy manager, I'm alerted once a day (not spammed per-check)
  when a drug I've configured a reorder threshold for runs low.

## Acceptance criteria (Given/When/Then)

- **Given** a batch expiring within the requested horizon with stock
  remaining, **when** `nearExpiryBatches` is queried, **then** it's
  included with the drug name resolved.
- **Given** a drug with `reorder_level: 10` and 5 units on hand across
  its batches, **when** `lowStockDrugs` is queried, **then** it's
  included; a drug with no `reorder_level` set is never included.
- **Given** a low-stock drug, **when** the daily sweep runs, **then**
  every admin/manager in that org gets one notification; a second sweep
  the same day does not notify them again.

## Traceability

`REQ022` `US-PHR-09`. `FR-PHR-11` (PRD).
