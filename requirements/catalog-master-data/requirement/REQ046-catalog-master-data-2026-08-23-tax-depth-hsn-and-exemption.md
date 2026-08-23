---
id: REQ046
type: requirement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ016
related: [REQ044]
---

# REQ046 — Catalog tax depth: HSN and GST-exemption on Products/Services

Second vertical slice of `REQ016` (packages, drug master, and tax depth),
after `REQ044` (drug master reference table). Targets `REQ016`'s
US-CAT-06.

## Why this slice

US-CAT-06's acceptance criterion: *"Given a healthcare consultation
service, when billed, then it is treated as GST-exempt by default per
current Indian tax treatment of healthcare services, while a retail/
pharmacy item on the same bill is taxed correctly with its own HSN and GST
rate."* `REQ016`'s own Data model impact section scopes this narrowly:
`Products`/`Services` gain `hsn` and `is_tax_exempt` only (no `gst_rate` on
this table — the AC's "own HSN and GST rate" for retail items is expected
from a future HSN-rate lookup, out of this slice). Neither column existed.

## What was built

- Migration `20260823060000_products_tax_depth`: `Products.hsn` (nullable
  text) and `Products.is_tax_exempt` (boolean, `DEFAULT false`).
- **The default is applied per creation module, not per row**, because the
  distinction the AC draws — "consultation service" vs. "retail/pharmacy
  item" — already exists as a real structural split in this codebase:
  `services.service.ts`'s `create()` (backing `manager/services/*` —
  clinical, clinician-linked, `duration_minutes`-bearing) now defaults
  `is_tax_exempt: true`; `products.service.ts`'s `create()` (backing
  `manager/products/*` — retail/stock-tracked) defaults `is_tax_exempt:
  false`. Both accept an explicit override in either direction. `update()`
  on both never re-defaults — an omitted field on update leaves the
  existing value untouched, matching every other optional field on these
  two DTOs.
- `hsn`/`is_tax_exempt` added to `CreateProductInput`/`UpdateProductInput`,
  `ServiceInput`, `ProductType`, and `ServiceType` (both GraphQL types are
  backed by the same `Products` table, per the existing split documented
  in `service.entity.ts`).
- 4 new unit tests (2 per service) proving the opposite defaults and that
  an explicit value always overrides the default.

## What this does not do

- No `gst_rate` column on `Products`/`Services` — `REQ016`'s own data-model
  section doesn't list one here (unlike `Drugs.gst_rate`, which does exist
  from `REQ044`). A retail item's actual GST rate is a HSN-to-rate lookup
  this slice does not build.
- No `patient_category_pricing_json`/`channel_pricing_json` — separate,
  larger `REQ016` scope (pricing depth, not tax classification).
- No frontend UI for `hsn`/`is_tax_exempt` yet — `manager/products/*` and
  `manager/services/*` don't expose the fields. The default-per-module
  logic means every *existing* item already gets a correct value without
  any UI change; adding the UI to override it is a follow-up, not blocking
  this slice's own acceptance criterion (which is about the default, not
  about admin editability).
- No `Packages`/`PackageConsumption`/`PriceHistory`/`ClinicianFavourites`
  tables — separate `REQ016` user stories, larger scope each.
