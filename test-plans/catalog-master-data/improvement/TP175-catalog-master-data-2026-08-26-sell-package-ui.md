---
id: TP175
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN155
related: []
---

# TP175 — Test plan: Sell a Package UI

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Empty state before purchase | Open a patient's Packages tab with no purchases | "No packages purchased for this patient yet." shown |
| 2 | Sell dialog opens | Click "Sell Package" | Dialog opens, `GET_SELLABLE_PACKAGES` fires |
| 3 | Sell an active package | Select a package, type a reference, click "Sell" | `purchasePackage` called with `{package_id, patient_id: <this patient>, purchase_tender_type: 'cash', purchase_reference}`; on success the Packages table refetches and shows the new row |
| 4 | Existing Packages-tab tests unaffected | Re-run the full `detail.test.jsx` suite | Insurance tab + prior Packages tab tests (empty state, list render, transfer-disabled, transfer-success) still pass |
| 5 | Lint clean | `eslint` on `detail.jsx`/`detail.test.jsx` | 0 errors; only pre-existing hex-color warnings, no new ones |
