---
feature: products
date: 2026-08-21
ids: [BUG001, PLAN015, TP045, TR044]
status: done
---

# products — 2026-08-21

A real cross-tenant IDOR, not a missing feature. Logged as `context/open-questions.md` #2 during Priority 1 test-writing (left unfixed pending a product/contract decision) and picked up once a decision was made: `Products`/`ProductCategories`/`ProductSubcategories` never had a `client_org_id` of their own, and every create path left the existing `clinic_id` column null too — so `findOne`'s tenant check silently short-circuited to "allowed" for any clinic-less row, making it readable cross-org by anyone who knew or guessed its id. Digging deeper than the original open question surfaced a more severe, previously-undocumented instance of the same bug class: `updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory` had **zero** tenant check at all, not just a broken null-guarded one.

Fixed by adding a direct `client_org_id` column (stamped from the JWT at create time, decoupled from any specific clinic) rather than the alternative fix (a UI clinic-picker) — no product-creation page has ever had one, which is itself evidence products were always meant to be an org-wide catalog. The migration backfills existing rows' `client_org_id` from their real appointment history where available, so already-shipped, already-tested functionality (`GP Consultation`, exercised throughout this session's REQ004/REQ007 work) didn't silently break — confirmed by re-running `finances.spec.js` and `manager-services.spec.js` (both pre-existing, both green before and after).

## Requirement

- [BUG001 — Cross-tenant IDOR via `product(id)`, zero tenant check on category/subcategory writes](../../requirements/products/bug/BUG001-products-2026-08-21-cross-tenant-idor.md) — done, updated 2026-08-21

## Implementation plan

- [PLAN015 — close the Products/Services IDOR](../../implementation-plans/products/bug/PLAN015-products-2026-08-21-cross-tenant-idor.md) — done

## Test plan

- [TP045 — close the Products/Services IDOR](../../test-plans/products/bug/TP045-products-2026-08-21-cross-tenant-idor.md) — approved

## Test results

- [TR044 — close the Products/Services IDOR](../../test-results/products/bug/TR044-products-2026-08-21-cross-tenant-idor.md) — passed
