---
id: TR044
type: bug
feature: products
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: BUG001
related: [PLAN015, TP045]
---

# Test result — close the Products/Services IDOR (BUG001/PLAN015/TP045)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest products services` (host-side `npm run test -- products services`, same result) — 68/68 passed, including 12 new cases covering `create*` stamping `client_org_id` from the JWT and the previously-**untested** `updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory` cross-org rejection (these had zero tenant check before this fix, so there was nothing to test).

Full backend regression: `npm test` — **43 suites / 488 tests, all green** (+11 tests vs. the prior REQ007 baseline this session).

## Live verification against the real backend

Logged in as `manager@medibook.dev`:

- `services` query still returns `GP Consultation` after the migration — confirms the backfill (org derived from the product's real appointment history via its clinic) preserved already-working, already-tested functionality rather than silently breaking it.
- `service(id: "740d1d0a-…")` — an org-less E2E throwaway row, previously readable cross-org by anyone who knew or guessed the id — now returns `Service not found` (404), confirming the IDOR is actually closed, not just theoretically fixed.
- `productCategories` correctly returns `[]` for the manager (both existing categories, "Supplements"/"Vitamins", have no appointment history to backfill an org from and stay org-less/admin-only — not a regression, they were already invisible to tenant callers before this fix too, just for the wrong reason).

## Browser e2e (regression, not new specs)

`npx playwright test e2e/finances.spec.js e2e/manager-services.spec.js --workers=1` — **6/6 passed**. Both specs depend on `GP Consultation` being visible to the manager account; both stayed green, confirming the backfill did its job.

## Scope note

This closes `context/open-questions.md` item #2 (Products/Categories/Subcategories tenant-scoping gap) in full, including a more severe instance of the same bug class than the original question described: `updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory` had **zero** tenant check at all before this fix, not just a broken null-guarded one.
