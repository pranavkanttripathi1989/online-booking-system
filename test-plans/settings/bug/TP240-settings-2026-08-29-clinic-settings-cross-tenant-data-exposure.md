---
id: TP240
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN220
related: [TR240]
---

# TP240 — Clinic Settings cross-tenant data exposure — test plan

## Cases

1. **An org-less admin sees "no organisation"** on the Clinic tab,
   with no `GET_CLINICS_FOR_SETTINGS` mock provided — proving the
   query never fires for this caller (a real regression would fail
   loudly, not silently pass).
2. **No cross-tenant data is present anywhere on the page** for an
   org-less admin — no other tenant's clinic name/address appears.
3. **A genuinely org-scoped caller (manager) still loads and shows
   their own real clinic correctly** — the fix must not regress the
   legitimate case.
4. **Live**: confirmed against the real dev stack with both
   `admin@medibook.dev` (org-less) and `manager@medibook.dev` (real
   org member).

## Out of scope

Changing `ClinicsService.findAll()`/`orgScope()`'s backend behavior —
correct and needed elsewhere for legitimate platform-wide tooling; not
part of this fix.
