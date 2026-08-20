---
id: TS015
type: test-suggestion
feature: manager-availability
created: 2026-03-19
updated: 2026-04-02
status: done
parent: unknown
related: [TP016, TR015]
---

# Manager Availability — Test Suggestions

**Derived from:** [manager-availability-test-results.md](../test-result/manager-availability-test-results.md)  
**Source File:** `frontend/src/pages/manager/Availability.jsx`  
**Last Updated:** 2026-03-30

---

## Implementation Status

### SUG-AVAIL-001 — Fix: `useMutation(GET_ROOMS_FOR_CLINIC)` → `useLazyQuery`
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. `import { useLazyQuery }` added; `[getRooms] = useLazyQuery(GET_ROOMS_FOR_CLINIC)` now correctly loads rooms on demand.

---

### SUG-AVAIL-002 — Fix: Room Loading Uses Wrong Query (`refetch` instead of `getRooms`)
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. `loadRoomsForClinic` now calls `getRooms({ variables: { clinicId } })` and reads `roomData?.rooms`.

---

### SUG-AVAIL-003 — Fix: Clinic Change Must Reset `room_id`
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. Clinic `onChange` now calls `setForm(prev => ({ ...prev, clinic_id: e.target.value, room_id: '' }))`.

---

### SUG-AVAIL-004 — Fix: Frontend Guard for Empty Required Dropdowns
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. `handleSubmit` guards: `if (!form.clinician_id) { setFormError(...); return }` and `if (!form.clinic_id) { setFormError(...); return }`.

---

### SUG-AVAIL-005 — Add Frontend Time Validation (End ≤ Start)
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. `if (form.start_time >= form.end_time) { setFormError('End time must be after start time.'); return }`.

---

### SUG-AVAIL-006 — Add Valid Date Range Validation (Until Before From)
**Status:** ✅ COMPLETED  
**Notes:** Fixed in prior QA round. `if (form.valid_until < form.valid_from) { setFormError('"Valid Until" cannot be before "Valid From".'); return }`.

---

### SUG-AVAIL-007 — Add React Error Boundary Around the Page
**Status:** ✅ COMPLETED  
**Notes:** Created `frontend/src/components/ErrorBoundary.jsx` (class-based, uses existing `ErrorFallback.jsx`). Entire `ManagerAvailability` return value wrapped in `<ErrorBoundary>`. Verified: page recovers from navigation without crashes.

---

### SUG-AVAIL-008 — Custom Dates: Validate Format Before Submit
**Status:** ✅ COMPLETED  
**Notes:** Implemented in `handleSubmit`. Splits comma-separated string, tests each date against `/^\d{4}-\d{2}-\d{2}$/`. Error shown: "Custom dates must be in YYYY-MM-DD format, separated by commas (e.g. 2026-04-01, 2026-04-15)." Browser-validated and passing (TC-08).

---

### SUG-AVAIL-009 — Add Test Case: Verify Room Dropdown Populates After Clinic Selection
**Status:** ✅ COMPLETED  
**Notes:** Added as TC-MGR-AVAIL-11 (extended) in test plan. Validated: selecting "Meridian Central" surfaces 3 rooms from offline fallback (Consultation A, B, Procedure Room 1). All 5 clinics have rooms mapped in `MOCK_ROOMS_BY_CLINIC`.

---

### SUG-AVAIL-010 — Add Test Case: Regression TC for Room Lazy Query
**Status:** ✅ COMPLETED  
**Notes:** TC-MGR-AVAIL-11 covers clinic change → room reset → new rooms load. Validated in browser test.

---

### SUG-AVAIL-011 — Formal TC: Submit with Start Time = End Time
**Status:** ✅ COMPLETED  
**Notes:** Added as TC-MGR-AVAIL-23 in test plan. Edge case E3 promoted to full test case. Validated via source guard.

---

### SUG-AVAIL-012 — Formal TC: Pagination / Large Dataset
**Status:** ✅ COMPLETED  
**Notes:** Added as TC-MGR-AVAIL-24 in test plan. `overflowX: 'auto'` wrapper confirmed in source. Large dataset rendering verified at the code level.

---

### SUG-AVAIL-013 — TC: Form State After Tab Navigation
**Status:** ✅ COMPLETED  
**Notes:** Added as TC-MGR-AVAIL-25 in test plan. Validated in browser: navigated away and back, form opens in fresh default state.

---

### SUG-AVAIL-014 — Add Mock Data Fallback for Offline Testing
**Status:** ✅ COMPLETED  
**Notes:** Three mock layers added to `Availability.jsx`: `MOCK_AVAILABILITIES` (5 records, all display scenarios), `MOCK_ROOMS_BY_CLINIC` (keyed by clinic ID, 12 rooms across 5 clinics), `MOCK_CLINICIANS_AV` / `MOCK_CLINICS_AV` (real seed IDs: `cln-*`, `cli-*`). Toggle: `VITE_USE_MOCK_API=true` in `.env` or simply leave backend offline.

---

## New Suggestions (Discovered During This Round)

---

### SUG-AVAIL-015 — Add Optimistic Update to Delete Flow
**Suggestion:** When `deleteAvailability` mutation is called, optimistically remove the record from the local list before the backend responds. If the mutation fails, re-add it.  
**Status:** PENDING  
**Notes:** Currently the record stays in the table even after a successful delete until `refetch()` completes. With backend offline, the mock table never refreshes. Optimistic UI would improve perceived performance. Implementation: filter `MOCK_AVAILABILITIES` state local copy on delete confirm.  
**Priority:** 🟡 Medium | **Effort:** ~20 lines

---

### SUG-AVAIL-016 — Convert Clinician/Clinic Selects to MUI Autocomplete
**Suggestion:** Replace `<Select>` with MUI `<Autocomplete>` for Clinician and Clinic dropdowns. Supports type-to-filter, keyboard navigation, and ARIA combobox pattern properly.  
**Status:** PENDING  
**Notes:** Current MUI Select works correctly for humans but is harder to automate in Playwright/Cypress. Autocomplete also degrades better for large lists (100+ clinicians). Also adds `aria-label` and better screen reader support.  
**Priority:** 🟢 Low–Medium | **Effort:** ~30 lines per dropdown

---

### SUG-AVAIL-017 — Add `isActive` Status Badge to Table Rows
**Suggestion:** Display a "Inactive" badge/chip in the CLINICIAN column when `avail.isActive === false`.  
**Status:** PENDING  
**Notes:** Currently inactive records display no visual indicator. Managers cannot distinguish active vs inactive availability schedules at a glance. A grey "Inactive" chip next to the clinician name would improve clarity.  
**Priority:** 🟢 Low | **Effort:** 5 lines

---

### SUG-AVAIL-018 — Accessibility: Add `aria-label` to Edit/Delete Icon Buttons
**Suggestion:** Add descriptive `aria-label` to icon buttons in the actions column:  
```jsx
<IconButton aria-label={`Edit availability for ${avail.clinician?.firstName}`}>
<IconButton aria-label={`Delete availability for ${avail.clinician?.firstName}`}>
```
**Status:** PENDING  
**Notes:** Current `<Tooltip>` provides visual label but icon buttons have no accessible name for screen readers. Required by WCAG 2.1 SC 4.1.2.  
**Priority:** 🟡 Medium | **Effort:** 2 lines

---

### SUG-AVAIL-019 — Persist Form State During Accidental Navigation
**Suggestion:** Store partially-filled form state in `sessionStorage`. If user navigates away and returns before submitting, offer "Restore draft?" prompt.  
**Status:** PENDING  
**Notes:** Current behaviour: navigating away and returning loses all form input. This is acceptable UX for short forms but may frustrate managers filling long availability records.  
**Priority:** 🟢 Low | **Effort:** ~25 lines

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-AVAIL-001 | Fix `useMutation(query)` → `useLazyQuery` | 🐛 Bug Fix | 🔴 Critical | ✅ COMPLETED |
| SUG-AVAIL-002 | Fix room loading call | 🐛 Bug Fix | 🔴 High | ✅ COMPLETED |
| SUG-AVAIL-003 | Reset `room_id` on clinic change | 🐛 Bug Fix | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-004 | Frontend guard for empty required fields | 🐛 Bug Fix | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-005 | End time ≤ Start time validation | ✨ UX | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-006 | Valid date range validation | ✨ UX | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-007 | React Error Boundary | 🛡 Resilience | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-008 | Custom dates format validation | ✨ UX | 🟢 Low | ✅ COMPLETED |
| SUG-AVAIL-009 | TC: Room dropdown populates after clinic select | 🧪 Test Coverage | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-010 | TC: Room lazy query regression | 🧪 Test Coverage | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-011 | TC: Start=End time blocked | 🧪 Test Coverage | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-012 | TC: 200+ records table scroll | 🧪 Test Coverage | 🟢 Low | ✅ COMPLETED |
| SUG-AVAIL-013 | TC: Form state after tab navigation | 🧪 Test Coverage | 🟢 Low | ✅ COMPLETED |
| SUG-AVAIL-014 | Mock data fallback for offline testing | 🧪 Test Infra | 🟡 Medium | ✅ COMPLETED |
| SUG-AVAIL-015 | Optimistic delete update | ⚡ Performance | 🟡 Medium | PENDING |
| SUG-AVAIL-016 | Clinician/Clinic → MUI Autocomplete | ♿ Accessibility + UX | 🟢 Low | PENDING |
| SUG-AVAIL-017 | Inactive badge in table rows | ✨ UX | 🟢 Low | PENDING |
| SUG-AVAIL-018 | `aria-label` on icon buttons | ♿ Accessibility | 🟡 Medium | PENDING |
| SUG-AVAIL-019 | Persist form state in sessionStorage | ✨ UX | 🟢 Low | PENDING |
