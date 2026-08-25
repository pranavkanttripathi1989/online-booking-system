---
id: TP164
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN140
related: [REQ100]
---

# TP164 — Test plan: payer-tariff pricing wiring

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped extension of an already-proven pure-function helper.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `resolveServicePrice()` — tariff supplied | Returns the tariff price, ignoring category/channel/base |
| 2 | `resolveServicePrice()` — no tariff supplied | Unchanged existing behavior (regression guard) |
| 3 | `resolveServicePrice()` — tariff + branch `skip` | Returns `null` — skip wins over a tariff |
| 4 | `resolveServicePrice()` — tariff + branch `override` | Tariff wins |
| 5 | `estimatedPayerCharge` — tariff exists | Returns the tariff amount, `has_tariff: true` |
| 6 | `estimatedPayerCharge` — no tariff | Falls through to base/category price, `has_tariff: false` |
| 7 | `estimatedPayerCharge` — cross-org product | Rejected |
| 8 | `estimatedPayerCharge` — unknown payer | Rejected |
| 9 | `estimatedPayerCharge` — patient-role caller, someone else's `patientId` | Rejected via `assertPatientAccessible` |
