---
id: TP256
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN236
related: [BUG061, PLAN236, TR256]
---

# TP256 — test plan for BUG061 fixes

1. **`patients/EditPatientPage.test.jsx`**
   - A real fetched patient renders its real name/email in the form.
   - A genuine `patient: null` result (a real, successful "no such
     patient" response) shows "Patient not found"; `MOCK_EDIT_DEFAULT`'s
     `Emily`/etc. never appears.
2. **Regression**: `test-results/index.test.jsx` (5 cases, existing) —
   the result-detail dialog table's `TableContainer` wrap must not
   break the existing render/empty-state/pagination-note assertions.
3. **Regression**: `patients/detail.test.jsx` (24 cases, existing) —
   none reference the exact toast strings changed, confirming the
   demo-mode disclosure wording change is invisible to existing
   coverage.
4. **Static**: `eslint` on all 9 touched files (0 errors); `npm run
   build` succeeds.
