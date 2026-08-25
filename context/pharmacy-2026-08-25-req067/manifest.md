---
id: CTX-pharmacy-2026-08-25-req067
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ067
related: [PLAN094, TP121, TR120]
---

# pharmacy — Near-expiry batch report and low-stock alerts (2026-08-25)

One of an 8-slice backend batch. Closes `REQ022`'s own `US-PHR-09`: new
`nearExpiryBatches`/`lowStockDrugs` queries, `Drugs.reorder_level`, and a
daily `LowStockSweepService` that notifies admins/managers once per
recipient per day.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ067 | [Near-expiry and low-stock alerts](../../requirements/pharmacy/improvement/REQ067-pharmacy-2026-08-25-near-expiry-and-low-stock-alerts.md) |
| implementation-plans | PLAN094 | [implementation plan](../../implementation-plans/pharmacy/improvement/PLAN094-pharmacy-2026-08-25-near-expiry-and-low-stock-alerts.md) |
| test-plans | TP121 | [test plan](../../test-plans/pharmacy/improvement/TP121-pharmacy-2026-08-25-near-expiry-and-low-stock-alerts.md) |
| test-results | TR120 | [results](../../test-results/pharmacy/improvement/TR120-pharmacy-2026-08-25-near-expiry-and-low-stock-alerts.md) |

## What shipped

`Drugs.reorder_level Int?`. New `NotificationEventType.low_stock_alert`
(standalone enum migration). `low-stock-sweep.service.ts` (new,
`@Cron('0 8 * * *')`).

## Live verification

`nearExpiryBatches` confirmed against a real seeded Paracetamol batch.
`lowStockDrugs` correctly empty (no dev drug has a threshold configured
yet) — the non-empty path is unit-tested directly.
