# Test Results Page — Test Plan

**Route:** `/test-results`
**File:** `frontend/src/pages/test-results/index.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Medical test results listing page with 6 mock results. Search by patient/test/ID, filter by type and status. KPI cards show counts. Clicking a row or the eye icon opens a `ResultDialog` showing per-parameter data with flags. "Order Test" button present (no handler). "Download PDF" in dialog for completed tests only.

---

## Test Cases

### TC-TRES-01 — Page Load
**Steps:** Navigate to `/test-results`. **Expected:** Title "Medical Test Results", count subtitle "6 total results · 1 pending". KPI cards: Total=6, Completed=4, Processing=1, Pending=1.

### TC-TRES-02 — KPI Cards: Colours
**Steps:** View KPIs. **Expected:** Total=blue (#1565C7), Completed=green (#0B7B5C), Processing=amber (#D97706), Pending=slate (#64748B). Icons in matching coloured circles.

### TC-TRES-03 — Search: By Patient Name
**Steps:** Type "Sarah". **Expected:** Only TR-002 (Sarah Miller) shown.

### TC-TRES-04 — Search: By Test Name
**Steps:** Type "Blood Count". **Expected:** TR-001 (Complete Blood Count) shown.

### TC-TRES-05 — Search: By ID
**Steps:** Type "TR-005". **Expected:** Only TR-005 (Robert Davis MRI) shown.

### TC-TRES-06 — Search: No Results
**Steps:** Type "xyz999". **Expected:** "No test results found" row in table.

### TC-TRES-07 — Type Filter
**Steps:** Select "Blood Test" from Type dropdown. **Expected:** 3 blood test rows shown (TR-001, TR-002, TR-004).

### TC-TRES-08 — Status Filter: Processing
**Steps:** Select "Processing". **Expected:** Only TR-004 shown.

### TC-TRES-09 — Status Filter: Pending
**Steps:** Select "Pending". **Expected:** Only TR-005 shown.

### TC-TRES-10 — Combined Filters
**Steps:** Type="Blood Test", Status="Processing". **Expected:** Only TR-004 shown.

### TC-TRES-11 — Table Row: Type Icon
**Steps:** View rows. **Expected:** 🩸 for Blood Test, 🩻 for X-Ray, 🧠 for MRI, 🧪 for Urine Test. Default 🧪 for unknown types.

### TC-TRES-12 — Table Row: Completed Date Column
**Steps:** View rows with null completedDate. **Expected:** "Pending" chip shown instead of a date string.

### TC-TRES-13 — Table Row: Status Chip
**Steps:** View each status. **Expected:** completed=success chip; processing=warning chip; pending=default chip. Each has matching icon.

### TC-TRES-14 — Open Result Dialog: Row Click
**Steps:** Click anywhere on a table row. **Expected:** `setViewResult(r)` fires; `ResultDialog` opens.

### TC-TRES-15 — Open Result Dialog: Eye Icon
**Steps:** Click eye icon. **Expected:** `e.stopPropagation()` called; `ResultDialog` opened. No duplicate events.

### TC-TRES-16 — Result Dialog: Completed with Values
**Steps:** Open TR-001. **Expected:** Per-parameter table shown: Hemoglobin, WBC, Platelets with values, reference ranges, and flag chips. "Download PDF" button shown.

### TC-TRES-17 — Result Dialog: Flag Colours
**Steps:** View TR-002. **Expected:** HbA1c (high) → red (#DC2626) value text; "high" chip in red. Normal → green (#0B7B5C).

### TC-TRES-18 — Result Dialog: Pending/Processing (No Values)
**Steps:** Open TR-004 or TR-005. **Expected:** "Results not yet available" placeholder text; No Download PDF button.

### TC-TRES-19 — Result Dialog: Close
**Steps:** Click "Close". **Expected:** `setViewResult(null)`; dialog closes.

### TC-TRES-20 — Download PDF Button (UI Only)
**Steps:** Click "Download PDF". **Expected:** **BUG:** No onClick handler; nothing happens. Enhancement needed.

### TC-TRES-21 — Order Test Button
**Steps:** Click "Order Test" in header. **Expected:** **BUG:** No onClick handler. Enhancement needed.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Type dropdown options derived dynamically | Types = ["All", "Blood Test", "X-Ray", "MRI", "Urine Test"] from `Set` of mock data |
| E2 | Unknown flag value | `FLAG_COLORS[flag]` = undefined → `color: 'text.primary'` fallback |
| E3 | Row click + eye icon click simultaneously | `stopPropagation` prevents double-open |
| E4 | Filter reset | Reset both dropdowns to "All"; all rows shown |
