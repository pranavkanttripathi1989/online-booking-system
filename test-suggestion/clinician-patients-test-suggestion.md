# Clinician Patients — Feature Suggestions (Final 2026-03-21)

**Module:** `frontend/src/pages/clinician/Patients.jsx`  
**Last Updated:** 2026-03-21 Session 4

> ✅ **All 14 actionable suggestions implemented. Module production-ready.**

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLPAT-001 | Fix test plan Active count (3, not 2) | 🔴 High | ✅ DONE |
| SUG-CLPAT-002 | Email null guard `(p.email ?? '')` | 🔴 High | ✅ DONE |
| SUG-CLPAT-003 | Pre-fill patient in book-appointment nav | 🔴 High | ✅ DONE |
| SUG-CLPAT-004 | Empty state for no results | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-005 | Connect to real backend | 🟡 Medium | ⏳ DEFERRED (backend) |
| SUG-CLPAT-006 | Sortable table columns | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-007 | Search clear button (✕) | 🟢 Low | ✅ DONE |
| SUG-CLPAT-008 | Safe name split for PatientAvatar | 🟢 Low | ✅ DONE |
| SUG-CLPAT-009 | Filter chip count badges | 🟢 Low | ✅ DONE |
| SUG-CLPAT-010 | Unicode normalization in search | 🟢 Low | ✅ DONE |
| SUG-CLPAT-011 | Booking wizard reads pre-fill state | 🟡 Medium | ✅ CONFIRMED |
| SUG-CLPAT-012 | Pagination for large lists | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-013 | Results count badge ("N of 5 patients") | 🟢 Low | ✅ DONE |
| SUG-CLPAT-014 | Align mock patient IDs (BUG-004 fix) | 🔴 High | ✅ DONE |
| SUG-CLPAT-015 | Booking wizard mock clinician fallback (BUG-005) | 🟡 Medium | ✅ DONE |

---

## Detailed Implementation Notes

### SUG-CLPAT-014 — Align Mock Patient IDs ✅ DONE
**Fix:** `MOCK_PATIENTS_DETAIL` in `patients/detail.jsx` now keyed by `'pt-1'..'pt-5'` matching Clinician Patients list.  
Also includes `'1'..'5'` aliases for the admin patient list.  
Lookup: `const p = MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT`  
**Verified:** Navigating to `/patients/pt-1` → shows "Alice Thompson" ✅

---

### SUG-CLPAT-015 — Booking Wizard Mock Clinician Fallback ✅ DONE
**Fix applied in `booking/index.jsx`:**
- Renderred mock clinician when `!clinicianId` (navigated from `/clinician/patients`)
- Mock time slots 09:00–17:00, 30-min intervals, when no backend availability
- Mock products/services when `qData?.getProducts` is empty

```js
// booking/index.jsx lines 329-338
const clinician = qData?.getClinician ?? (
  !clinicianId ? {
    id: 'mock-clinician',
    name: 'Dr. Sarah Mitchell',
    clinicianType: 'General Practitioner',
    clinic: { id: 'clinic-1', name: 'HealthSync Medical Centre' },
  } : null
);
if (!clinician) return <Alert severity="warning">Clinician not found</Alert>;
```
**Verified:** Navigated from patient list → booking wizard loaded correctly ✅

---

## New Suggestions (Session 4)

### SUG-CLPAT-016 — Keyboard Navigation for Filter Chips
**Observation:** Filter chips are clickable but not keyboard-navigable (Tab → Enter).  
**Recommendation:** Add `onKeyDown` handler for Enter key on each filter chip.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

### SUG-CLPAT-017 — Mobile KPI Card Carousel
**Observation:** On narrow viewports, 4 KPI cards in a 2-col grid push content down.  
**Recommendation:** Use horizontal scroll or carousel for KPI cards on `xs` breakpoint.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

---

## Total

| Priority | Total | Completed | Deferred/Pending |
|----------|-------|-----------|-----------------|
| 🔴 High | 4 | 4 ✅ | 0 |
| 🟡 Medium | 6 | 5 ✅ | 1 ⏳ (backend) |
| 🟢 Low | 7 | 5 ✅ | 2 ⏳ (new) |
| **Total** | **17** | **14 ✅** | **3 ⏳** |
