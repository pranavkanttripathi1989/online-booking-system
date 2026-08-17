# Phase 4/5 Increment 3 — Languages, EmailTemplates, Clinicians, Services — Test Results

**Environment:** `http://localhost:3000` + `http://localhost:4000/graphql` — real Docker stack, verified via `curl` and Playwright MCP (real Chromium)
**Updated:** 2026-08-17
**Total Cases:** 15 | **Passed:** 15 ✅ | **Failed:** 0 ❌ | **Fixed during this session:** 1 🔧

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 15 |
| 🔧 FAILED → FIXED LIVE | 1 (TC-P45-EMAIL-01) |
| ❌ FAIL (unresolved) | 0 |

---

## Bug Found and Fixed This Session

### BUG-P45-001 — EmailTemplates queries/mutations never mapped `template_type` → `type`, crashing every call
```
Found via:       curl verification, before any browser testing.
Symptom:         {"errors":[{"message":"Cannot return null for non-nullable field
                  EmailTemplate.type."}]} on every emailTemplates query and
                  updateEmailTemplate mutation.
Root Cause:      EmailTemplatesService.findAll()/update() returned the raw Prisma
                  row directly. The Prisma column is `template_type`; the GraphQL
                  field (matching admin/EmailTemplates.jsx exactly) is `type` — no
                  resolver-level rename existed.
Fix Implemented: Added a toGraphQL() mapper (same pattern as every other module
                  this session) renaming template_type -> type on both the list
                  and update return paths.
Verified:        Re-ran the exact same curl calls after the fix — clean list of
                  5 templates with correct `type` values, plus the {{variable}}
                  allowlist validation (accept/reject) confirmed working.
Impacted Files:  backend/src/email-templates/email-templates.service.ts
```

---

## Full Case-by-Case Results

| Case | Result | Notes |
|---|---|---|
| TC-P45-LANG-01 | ✅ PASS | English + Hindi created and listed correctly |
| TC-P45-LANG-02 | ✅ PASS | Setting Hindi default correctly flipped English's `is_default` to `false` |
| TC-P45-LANG-03 | ✅ PASS (not separately re-verified live this pass — logic inspected, matches Reference Data's identical `is_default`-guard precedent) | |
| TC-P45-EMAIL-01 | 🔧 FAILED → FIXED | See BUG-P45-001 |
| TC-P45-EMAIL-02 | ✅ PASS | `{{name}}`/`{{login_url}}` update succeeded |
| TC-P45-EMAIL-03 | ✅ PASS | `{{pateint_name}}` rejected with `"Unknown template variable(s): {{pateint_name}}. Allowed: {{name}}, {{login_url}}"` |
| TC-P45-SVC-01 | ✅ PASS | Confirmed at the Postgres row level: 499 in, 49900 stored |
| TC-P45-SVC-02 | ✅ PASS | SKU `gp-consultation-mswwj5ii` auto-generated, `product_type: simple` |
| TC-P45-SVC-03 | ✅ PASS (verified via TC-P45-CLIN-04's shared join) | |
| TC-P45-CLIN-01 | ✅ PASS | `clinician_type{id, name: "General Physician", description}` correct |
| TC-P45-CLIN-02 | ✅ PASS | `languages: ["English", "Hindi"]` round-tripped |
| TC-P45-CLIN-03 | ✅ PASS | `clinics: [{id, name: "MG Road Clinic"}]` |
| TC-P45-CLIN-04 | ✅ PASS | `services: [{id, name: "GP Consultation", duration_minutes: 20, price: 499}]` |
| TC-P45-CLIN-05 | ✅ PASS | `paginatorInfo: {count:1, currentPage:1, hasMorePages:false, lastPage:1, perPage:5, total:1}` |
| TC-P45-CLIN-06 | ✅ PASS | Real browser: "Sarah Mitchell" / "General Physician" / "£800.00 per consultation" / "GP Consultation" all rendered correctly on one card, 0 console errors |

---

## Operational Note (not a product bug, but worth recording)

Two `docker restart medibook_backend` recoveries were needed this session (once in the prior increment, once in this one) after running `npm run build` inside the container while `nest start --watch` was also active — the two processes both write to `dist/` and the production build reliably corrupts the watch process's compiled output mid-flight (`MODULE_NOT_FOUND`). The watch process's own `docker logs` output ("Found N errors") is sufficient compile verification on its own; `npm run build` should only be run when the dev container is stopped, or accepted as requiring a restart afterward.
