---
id: TP165
type: improvement
feature: patient-payments
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN141
related: [REQ101]
---

# TP165 — Test plan: GST rate/GSTIN on real appointment payments

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped extension to an already-proven, already-tested payment
flow.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | Non-exempt product, `gst_rate` set, clinic `gstin` set | Correct `cgst_amount`/`sgst_amount` split, `igst_amount: 0`, `place_of_supply` = clinic's state |
| 2 | Non-exempt product, `gst_rate` set, clinic `gstin` NOT set | All GST fields stay `null` |
| 3 | Non-exempt product, `gst_rate` NOT set, clinic `gstin` set | All GST fields stay `null` |
| 4 | Exempt product | Unchanged existing zero-fill behavior, regardless of `gst_rate`/`gstin` |
| 5 | Odd paise rounding | No paise lost/gained across `cgst_amount + sgst_amount` vs. the naive full tax amount |
| 6 | `services.service.ts` create/update | Persists an explicit `gst_rate` |
| 7 | `clinics.service.ts` create | Persists `state`/`gstin` when supplied |
| 8 | Frontend — services form | New "GST Rate (%)" field round-trips through create/edit |
| 9 | Frontend — clinic create/edit forms | New "State"/"GSTIN" fields round-trip through create/edit |
