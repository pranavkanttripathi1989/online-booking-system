---
id: TR162
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP162
related: [PLAN151]
---

# TR162 — Test results: branch-override admin UI

## TP162 case outcomes

All 4 frontend cases pass on the first run (`frontend/src/pages/manager/
services/index.test.jsx`, new file — this page had no prior unit test
coverage):

```
PASS src/pages/manager/services/index.test.jsx (19.518 s)
  ServiceCatalog branch pricing (REQ111)
    ✓ enables Branch pricing for an org-level master service
    ✓ disables Branch pricing for a clinic-scoped service
    ✓ seeds the dialog from an existing override
    ✓ shows a validation error and does not call the mutation when Override has no price

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

Case 5 (backend `clinic_id` field) confirmed via `npx tsc --noEmit` —
clean, no type errors from the new `@Field(() => ID, { nullable: true })
clinic_id?: string` addition to `ServiceType`.

## Notes

Category/channel override editing intentionally has no test coverage
here — out of scope per `REQ111`'s own doc (flat-price override only).
No backend service/resolver logic changed — `productBranchOverrides`/
`setProductBranchOverride` are reused exactly as `REQ055` built them.
