---
id: BUG001
type: bug
feature: products
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN015, TP045, TR044]
---

# Products/Services: cross-tenant IDOR via `product(id)`, and zero tenant check on category/subcategory writes

**Origin:** logged as `context/open-questions.md` #2 during Priority 1 test-writing, left unfixed pending a product/contract decision. Picked up now that a decision has been made (see below).

## The bug, precisely

`Products`/`ProductCategories`/`ProductSubcategories` have a nullable `clinic_id` column but no `client_org_id` of their own. Every create path — `ProductsService.create()`, `createCategory()`, `createSubcategory()`, and `ServicesService.create()` (writes the same table) — never sets `clinic_id`, so **every product/category/subcategory ever created through the live UI has `clinic_id: null`** (confirmed directly against the running dev database, not assumed: all 9 current rows).

`findAll`/`categories`/`subcategories` scope by a `clinic: { client_org_id }` relation filter, which a `clinic_id: null` row always fails — so a tenant caller can't see the very rows they created. `findOne()`'s check is `if (user.client_org_id && row.clinic && row.clinic.client_org_id !== user.client_org_id) throw NotFound` — when `row.clinic` is `null`, the check short-circuits to `false` and is skipped entirely. **Any authenticated caller, from any org, can read a clinic-less product directly via `product(id)`/`service(id)` once they know or guess its id.** `update()`/`remove()` call `findOne()` first and inherit the same gap.

Separately, and worse: `updateCategory`, `deleteCategory`, `updateSubcategory`, `deleteSubcategory` have **no tenant check at all** — not even the broken null-guarded one. They `findUnique({ where: { id } })` with no org filter, then write. Any authenticated `manager`/`admin`/`super_admin` can rename or delete **any org's** product category or subcategory by id. This is a distinct, more severe instance of the same bug class than what the open question originally described (it only flagged the `Products` read path).

## Decision: direct `client_org_id` column, not a UI clinic-picker

The open question offered two fixes: (a) give `Products`/`ProductCategories`/`ProductSubcategories` their own `client_org_id`, stamped from the JWT at create time, decoupled from any specific clinic; or (b) add `clinic_id` to the create DTOs and require the frontend to select one.

Going with (a). No product-creation page (`manager/products/{index,create,edit}.jsx`, `manager/services/create.jsx`) has ever had a clinic-selection control — that silence across every consuming page is itself evidence products were always meant to be an org-wide catalog, not clinic-specific, and the `clinic`-relation filters were the actual design mismatch. (b) would also mean shipping a frontend change to fix a backend security bug, a larger and riskier surface for what should be a contained fix.

## Blast-radius check before touching data

`GP Consultation` (the product exercised throughout this session's REQ004/REQ007 work, and the subject of two live e2e specs) is `clinic_id: null` today but **is** referenced by real `Appointments` rows that do have a `clinic_id`. A naive migration that only adds the column would leave it `client_org_id: null` too, making it invisible to `manager@`/`clinician@`/`receptionist@` (real client_org_id) going forward — a regression in already-shipped, tested functionality, not just a fix. The migration therefore backfills `client_org_id` from each product's linked appointments' clinic where one exists, before the strict filter goes live. Rows with no appointment history (the four `E2E Service *` throwaway rows, `Supplements`/`Vitamins` categories) stay `null` — visible only to `admin`/`super_admin`, matching the existing platform-wide-role default used everywhere else in this codebase for records that predate an org linkage.

## Acceptance criteria

- A tenant caller (`clinic_id` irrelevant now) sees only their own org's products/categories/subcategories in every query.
- `product(id)`/`service(id)` for a different org's row returns not-found, not the row.
- `updateProductCategory`/`deleteProductCategory`/`updateProductSubcategory`/`deleteProductSubcategory` reject a cross-org id.
- `GP Consultation` remains visible to `manager@medibook.dev` after the migration (regression check, not just a new-behavior test).
- Explicit cross-tenant rejection test per CLAUDE.md hard rule 6, on every affected resolver.
