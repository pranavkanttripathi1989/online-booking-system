---
id: TR167
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP167
related: [PLAN153]
---

# TR167 — Test results: retention enforcement extension (consents)

## TP167 case outcomes

All 5 cases pass. `retention-purge.service.spec.ts` gained a new consents
purge case and its existing "supported data class" assertion was updated
for the new `['test_results', 'consents']` list.

```
PASS src/consent/consent.service.spec.ts
PASS src/consent/retention-purge.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
```

`npx tsc --noEmit` — clean.

## Notes

Backend-only, matching the parent `compliance-dpdp` feature's own state —
no frontend page exists anywhere for retention policies today (this is
purely an admin-API capability), so there is no UI surface for this
slice to touch. `clinical_records` and `messages` remain deliberately
unenforced — each has its own real, distinct blocker (legal-review
tension; two-party deletion-scoping question) unrelated to this slice's
purely mechanical fix (a missing `is_deleted` column).
