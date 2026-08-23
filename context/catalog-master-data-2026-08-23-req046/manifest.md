---
id: CTX-catalog-master-data-2026-08-23-req046
type: requirement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ046
related: [REQ016, REQ044, PLAN049, TP076, TR075]
---

# catalog-master-data — REQ046, tax depth on Products/Services (2026-08-23)

Second vertical slice of `REQ016`, after `REQ044` (drug master). Adds
`hsn`/`is_tax_exempt` to `Products` (which backs both the retail-catalog
and clinical-services GraphQL surfaces), with the default value applied
per creation module rather than per row.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ046 | [tax depth](../../requirements/catalog-master-data/requirement/REQ046-catalog-master-data-2026-08-23-tax-depth-hsn-and-exemption.md) |
| implementation-plans | PLAN049 | [implementation](../../implementation-plans/catalog-master-data/requirement/PLAN049-catalog-master-data-2026-08-23-tax-depth-hsn-and-exemption.md) |
| test-plans | TP076 | [test plan](../../test-plans/catalog-master-data/requirement/TP076-catalog-master-data-2026-08-23-tax-depth-hsn-and-exemption.md) |
| test-results | TR075 | [results](../../test-results/catalog-master-data/requirement/TR075-catalog-master-data-2026-08-23-tax-depth-hsn-and-exemption.md) |
| test-suggestions | — | skipped — additive-column default-value change matching `REQ041`'s established pattern |

## What this closes

`REQ016`'s US-CAT-06. Packages, per-category/channel pricing, price-list
history, and `ClinicianFavourites` remain unbuilt, larger scope each.

## Notable design note

The AC's "consultation service vs. retail item" distinction is read off
*which service created the row* (`ServicesService` vs. `ProductsService`),
not a heuristic on any data field — the two creation paths already never
overlap, so this is simpler and more reliable than inferring intent from
`duration_minutes` or any other optional column.
