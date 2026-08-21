---
id: TP045
type: bug
feature: products
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: BUG001
related: [PLAN015]
---

# Test plan — close the Products/Services IDOR (BUG001/PLAN015)

## Unit tests (`products.service.spec.ts` + `services.service.spec.ts`, 12 new/changed cases)

`findOne`/`service`: a same-org row still returns; a cross-org row still 404s (unchanged); the previously-documented "KNOWN GAP" case flips to asserting the org-less row now correctly 404s for a tenant caller, and remains readable for a platform-wide caller (org-less default preserved).

`create`/`createService`/`createCategory`/`createSubcategory`: each stamps `client_org_id` from the caller's JWT — verified directly against the `prisma.create` call args — and stamps `undefined` for a platform-wide caller.

`updateCategory`/`deleteCategory`/`updateSubcategory`/`deleteSubcategory` — new cases, since these previously had **no test at all** for tenant isolation (because there was no check to test): a cross-org id returns `{success:false, "not found"}` without ever calling `prisma.update`.

`findAll`/`categories`/`subcategories`: scoping assertion moved from the old `clinic: {client_org_id}` relation filter to the new direct `client_org_id` column filter.

## Live verification against the real backend

Logged in as `manager@medibook.dev`: `services` query still returns `GP Consultation` post-migration (regression check on real, previously-created data — this is the actual reason the migration includes a backfill, not just a schema change). Direct `service(id)` lookup of an org-less E2E throwaway row, previously readable, now returns `Service not found`.

## Browser e2e (regression, not new specs)

`e2e/finances.spec.js` and `e2e/manager-services.spec.js` — both pre-existing, both green before this change, both depend on `GP Consultation` being visible to the manager account. Re-run to confirm the fix didn't silently break either.

## Non-goals for this plan

`ProductCategories`/`ProductSubcategories` UI (no clinic/org picker anywhere, and none is being added — see BUG001's rationale for why `client_org_id` is stamped server-side instead). Real slot/duration validation on `Products.duration_minutes` — out of scope, unrelated to this bug.
