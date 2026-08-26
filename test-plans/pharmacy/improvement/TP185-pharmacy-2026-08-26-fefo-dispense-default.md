---
id: TP185
type: improvement
feature: pharmacy
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN165
related: []
---

# TP185 — Test plan: FEFO default on the dispense batch picker

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Defaults to the earliest-expiry batch | Two batches, dialog opened, submit with no dropdown interaction | `dispensePrescriptionItem` called with the earlier batch's id |
| 2 | Dropdown still restricted to the matching drug | Existing test | Unaffected |
| 3 | Explicit selection still works | Existing "real dispensePrescriptionItem call" test | Unaffected — re-selecting the already-defaulted value is harmless |
| 4 | Expiry date visible in the option label | Manual read of the JSX | `exp {date}` present |
| 5 | Full pharmacy page suite regression | `npx jest src/pages/manager/pharmacy` | 6/6 pass |
| 6 | Lint clean | `eslint` on both touched files | 0 warnings |
