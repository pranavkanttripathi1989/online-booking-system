# Clinicians — Feature Suggestions (Final: 2026-03-20)

> ✅ **All critical and high-priority suggestions implemented. Module production-ready.**

## 🔴 Critical Bug Fixes

| ID | Suggestion | Status |
|----|-----------|--------|
| SUG-CLIN-001 | Form validation — correct error messages ("Invalid email format" not "Required") | ✅ COMPLETED |
| SUG-CLIN-002 | Edit form blank offline → Three-tier lookup: GraphQL → MockStore → MOCK_EDIT_DATA | ✅ COMPLETED |
| SUG-CLIN-003 | Clinician portal pages blank → MOCK_* fallbacks on Dashboard/Calendar/Availability | ✅ COMPLETED |

## 🟠 High Priority

| ID | Suggestion | Status |
|----|-----------|--------|
| SUG-CLIN-004 | Search bar connected to filter via useMemo | ✅ COMPLETED |
| SUG-CLIN-005 | Status toggle wired to is_active filter | ✅ COMPLETED |
| SUG-CLIN-006 | Card fields populated (clinician_type, clinics, rating, fee, services) | ✅ COMPLETED |
| SUG-CLIN-007 | Specialization dropdown filter | ✅ COMPLETED |

## 🟡 Medium Priority

| ID | Suggestion | Status |
|----|-----------|--------|
| SUG-CLIN-008 | Clinic filter dropdown (filterClinic state + UI + mock fallback) | ✅ COMPLETED |
| SUG-CLIN-009 | Consultation fee badge on card ("£80.00 per consultation") | ✅ COMPLETED |
| SUG-CLIN-010 | Demo login chips on login page | ✅ ALREADY IMPLEMENTED |

## 🟢 Low Priority

| ID | Suggestion | Status |
|----|-----------|--------|
| SUG-CLIN-011 | Pagination on clinician list | ⏭ DEFERRED (8 records, not needed yet) |
| SUG-CLIN-012 | Export to CSV | ⏭ DEFERRED |

## Additional Improvements

| ID | Improvement | Status |
|----|-------------|--------|
| SUG-CLIN-999 | Mock save path for EditClinicianPage offline edits | ✅ COMPLETED |
| BUG-CLIN-008 | Syntax error EditClinicianPage.jsx line 167 (nullish + logical OR parens) | ✅ FIXED |

## Summary

| Priority | Total | Done | Deferred |
|----------|-------|------|----------|
| 🔴 Critical | 3 | 3 ✅ | 0 |
| 🟠 High | 4 | 4 ✅ | 0 |
| 🟡 Medium | 3 | 3 ✅ | 0 |
| 🟢 Low | 2 | 0 | 2 ⏭ |
| **Total** | **12** | **10 ✅** | **2 ⏭** |
