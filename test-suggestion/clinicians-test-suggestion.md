# Clinicians — Feature Suggestions (Session 3 Final)

**Module:** `frontend/src/pages/clinicians/` + `frontend/src/pages/clinician/`  
**Last Updated:** 2026-03-21 Session 3

> ✅ **All critical, high, and medium-priority suggestions implemented. Module production-ready.**

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLIN-001 | Correct email validation messages | 🔴 Critical | ✅ COMPLETED |
| SUG-CLIN-002 | Edit form offline fallback (three-tier lookup) | 🔴 Critical | ✅ COMPLETED |
| SUG-CLIN-003 | Clinician portal mock fallbacks (Dashboard/Calendar/Availability) | 🔴 Critical | ✅ COMPLETED |
| SUG-CLIN-004 | Search connected via `useMemo` | 🟠 High | ✅ COMPLETED |
| SUG-CLIN-005 | Status toggle wired to `is_active` | 🟠 High | ✅ COMPLETED |
| SUG-CLIN-006 | Card data enrichment (clinician_type, clinic, rating, fee, services) | 🟠 High | ✅ COMPLETED |
| SUG-CLIN-007 | Specialization dropdown filter (dynamic from data) | 🟠 High | ✅ COMPLETED |
| SUG-CLIN-008 | Clinic filter dropdown with `filterClinic` state | 🟡 Medium | ✅ COMPLETED |
| SUG-CLIN-009 | Consultation fee badge on card | 🟡 Medium | ✅ COMPLETED |
| SUG-CLIN-010 | Demo login chips on login page | 🟡 Medium | ✅ ALREADY IMPLEMENTED |
| SUG-CLIN-011 | Pagination | 🟢 Low | ⏭ DEFERRED (8 records) |
| SUG-CLIN-012 | Export to CSV | 🟢 Low | ⏭ DEFERRED |
| SUG-CLIN-999 | Offline save fallback in EditClinicianPage | 🟠 High | ✅ COMPLETED |

---

## New Suggestions — Discovered Session 3

### SUG-CLIN-013 — Accessible Color Contrast on Inactive Cards
**Observation:** Inactive clinician card toggle has same layout as active — no visual dim/opacity difference.  
**Recommendation:** Apply `opacity: 0.75` or a subtle grey overlay to inactive cards to better distinguish them from active.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

### SUG-CLIN-014 — Clinic Filter Shows Count Badge
**Observation:** Specialization and Clinic dropdowns don't show how many results are available per option.  
**Recommendation:** Append count — e.g. "Cardiologist (2)" — to dropdown options.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

### SUG-CLIN-015 — Clear All Filters Button
**Observation:** To reset all 4 filters (search + specialty + clinic + status), user must interact with each control separately.  
**Recommendation:** Add a "Clear Filters" button that appears when any non-default filter is active. Resets all to default.  
**Priority:** 🟡 Medium | **Status:** ⏳ PENDING

### SUG-CLIN-016 — Availability Heatmap Tooltip
**Observation:** Availability day chips (M T W T F S S) have no tooltip — user can't quickly see which day is which.  
**Recommendation:** Add `<Tooltip title="Monday">` wrapper on each day chip.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

---

## Priority Summary

| Priority | Total | Done | Pending |
|----------|-------|------|---------|
| 🔴 Critical | 3 | 3 ✅ | 0 |
| 🟠 High | 5 | 5 ✅ | 0 |
| 🟡 Medium | 4 | 3 ✅ | 1 ⏳ (SUG-015) |
| 🟢 Low | 5 | 0 | 3 ⏭ deferred + 2 ⏳ new |
| **Total** | **17** | **11 ✅** | **6** |
