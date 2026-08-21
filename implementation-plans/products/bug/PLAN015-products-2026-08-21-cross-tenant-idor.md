---
id: PLAN015
type: bug
feature: products
created: 2026-08-21
updated: 2026-08-21
status: done
parent: BUG001
related: [TP045, TR044]
---

# Implementation plan — close the Products/Services IDOR (BUG001)

## Schema

Hand-written migration (per CLAUDE.md — `prisma migrate dev` can't run non-interactively here):

1. `ALTER TABLE "Products"/"ProductCategories"/"ProductSubcategories" ADD COLUMN "client_org_id" TEXT` + FK to `ClientOrganizations(id)`, nullable — same shape as `AppointmentPayments.client_org_id`.
2. Backfill `Products.client_org_id` from `Appointments.clinic_id → Clinics.client_org_id` for any product with appointment history, via a correlated subquery. Categories/subcategories have no such history to backfill from — they stay `null` (2 rows: Supplements, Vitamins).
3. `schema.prisma`: add the three columns + relations, plus the corresponding back-relation arrays on `ClientOrganizations`.

## Backend — `products.service.ts`

- `create(input, user)` — now takes `user`, stamps `client_org_id: user.client_org_id ?? null`.
- `findAll`/`findOne` — replace the `clinic: { client_org_id }` relation filter with a direct `client_org_id: user.client_org_id ?? undefined` filter (queries) / `row.client_org_id !== user.client_org_id` check (findOne). Org-less caller unfiltered, matching every other domain's default.
- `categories`/`subcategories` — same direct-column filter, replacing the relation filter.
- `createCategory`/`createSubcategory(input, user)` — now take `user`, stamp `client_org_id`.
- `updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory(id, user)` — now take `user`; add a `findCategoryScoped`/`findSubcategoryScoped` helper mirroring `findOne`'s check (404 on cross-org, not a different error — doesn't reveal existence) before writing. This closes the previously-*zero*-check gap, not just the null-guard one.

## Backend — `products.resolver.ts`

Add `@CurrentUser() user: JwtPayload` to every mutation that didn't already have it (`createProduct`, `createProductCategory`, `updateProductCategory`, `deleteProductCategory`, `createProductSubcategory`, `updateProductSubcategory`, `deleteProductSubcategory`) and thread it through to the service call.

## Backend — `services.service.ts` / `services.resolver.ts`

Same `create(input, user)` fix — `ServicesService.create()` writes to the same `Products` table via the same DTO gap (the open question's own addendum). `services.resolver.ts`'s `createService` gets `@CurrentUser()`.

## Testing

`products.service.spec.ts` / `services.service.spec.ts`: happy path unaffected; add explicit cross-tenant rejection cases for `findOne`/`service`, and — new — for `updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory` (previously untested because previously unchecked). Confirm `create*` stamps `client_org_id` from the JWT, never a client-supplied value (none exists on the DTO — nothing to check there beyond "the column is set").

Live regression check against the real dev DB after migration: `GP Consultation` still visible to `manager@medibook.dev` via `services`/`myFinanceTransactions`-adjacent queries; `finances.spec.js` and `manager-services.spec.js` (both e2e, both pre-existing, both green before this change) re-run to confirm no regression.

## Verification

Backend `npm test` full suite green, migration applied via `prisma migrate deploy`, `prisma generate` + `docker restart medibook_backend`, e2e regression check, commit.
