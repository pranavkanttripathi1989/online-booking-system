---
id: TP113
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN086
related: [REQ059]
---

# TP113 — Test plan for the pharmacy UI completion

## Frontend unit — `frontend/src/pages/manager/pharmacy/index.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | Real drugs render (platform-seeded + tenant) | Both appear; edit/delete icons are absent for the platform-seeded row, present for the tenant's own drug |
| 2 | Creating a drug | Real `createDrug` mutation called with the right variables; list refreshes for real |
| 3 | Dispense batch picker | Restricted to batches whose `drug_id` matches the selected prescription item's `drug_id` — a mismatched-drug batch never appears as an option |
| 4 | A real dispense | `dispensePrescriptionItem` called with `{prescription_item_id, batch_id, quantity}` matching the form; success message shown |
| 5 | Movement History dialog | Real `stockMovements` rows render, signed quantity deltas, a dispense's `reference_type` renders as "Prescription dispense" |

## e2e — `frontend/e2e/pharmacy-completion.spec.js` (new), against the real backend

| # | Scenario | Assertion |
|---|---|---|
| 1 | Log in as `staff` | The "Pharmacy" nav item is visible and reachable — proves the route/nav fix, not just the backend gate |
| 2 | Create a drug through the Drug Catalog tab | It appears as a real option in the Stock tab's receive-stock drug dropdown |
| 3 | Dispense a real prescription item against a real batch | The batch's remaining count decrements by the dispensed quantity in the Stock tab; the batch's own History dialog shows the real `dispense` movement with the correct signed delta |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test && npm run build
npx playwright test pharmacy-completion.spec.js
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite re-run only as a
sanity check, not because backend code changed.
