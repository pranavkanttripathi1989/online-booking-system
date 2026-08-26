---
id: CTX-catalog-master-data-2026-08-26-req115
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ115
related: [PLAN155, TP175, TR175]
---

# catalog-master-data — REQ115: Sell a Package UI (2026-08-26)

Second slice of the next 10-slice batch (`project-plans/analysis/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ115 | [Sell a Package UI](../../requirements/catalog-master-data/improvement/REQ115-catalog-master-data-2026-08-26-sell-package-ui.md) |
| implementation-plans | PLAN155 | [implementation plan](../../implementation-plans/catalog-master-data/improvement/PLAN155-catalog-master-data-2026-08-26-sell-package-ui.md) |
| test-plans | TP175 | [verification plan](../../test-plans/catalog-master-data/improvement/TP175-catalog-master-data-2026-08-26-sell-package-ui.md) |
| test-results | TR175 | [verification results — pass](../../test-results/catalog-master-data/improvement/TR175-catalog-master-data-2026-08-26-sell-package-ui.md) |

## What shipped

`purchasePackage` (REQ054) has been real and tested since 2026-08-25 but
had zero frontend callers anywhere — confirmed by grep before scoping
this batch. A "Sell Package" button + dialog now lives on
`patients/detail.jsx`'s existing Packages tab (built by REQ110), reusing
the tender-type `TextField select` convention from
`appointments/detail.jsx`'s counter-payment dialog and the existing
`refetchPackages()` wiring already used by the Transfer flow.

## Verification

Frontend: `detail.test.jsx` 8/8 (1 new), `eslint` clean (0 errors, only
pre-existing hex-color warnings). No backend change — GraphQL contract
unchanged, `purchasePackage` untouched.
