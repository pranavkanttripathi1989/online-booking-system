# Staff Appointments — Test Plan

**Route:** `/staff/appointments`
**File:** `frontend/src/pages/staff/Appointments.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Staff appointment management page. Features a rich table with search, status filter, date range filters, bulk selection, per-row cancel via ConfirmDialog, and a "Book Appointment" modal. All data is local mock state (no Apollo). Export CSV button present (no handler).

---

## Test Cases

### TC-STFAPPT-01 — Page Load
**Steps:** Navigate to `/staff/appointments`. **Expected:** Title "Appointments", `{4} total` chip, "Export CSV" and "Book Appointment" buttons visible; table shows 4 rows.

### TC-STFAPPT-02 — Table: Column Headers
**Steps:** View the table header. **Expected:** Checkbox, Date & Time, Patient, Clinician, Clinic & Room, Duration, Service & Price, Status, Actions.

### TC-STFAPPT-03 — Search: By Patient Name
**Steps:** Type "Emma" in search. **Expected:** Only Emma Wilson row shown.

### TC-STFAPPT-04 — Search: By Clinician Name
**Steps:** Type "Marcus". **Expected:** James Brown row (Dr. Marcus Osei) shown.

### TC-STFAPPT-05 — Status Filter: Select "completed"
**Steps:** Choose "Completed" from status dropdown. **Expected:** Only Lily Chen row shown.

### TC-STFAPPT-06 — Status Filter: Active Chip Shown
**Steps:** Select any non-"all" filter. **Expected:** Chip "Status: {filter}" shown; clicking its X resets to "all".

### TC-STFAPPT-07 — Date Range Filters (UI Only)
**Steps:** Enter a From date. **Expected:** Field accepts date input; **BUG:** No filter logic wired to date pickers; table unaffected.

### TC-STFAPPT-08 — Checkbox: Select One Row
**Steps:** Check one row's checkbox. **Expected:** Row highlighted; bulk action bar appears.

### TC-STFAPPT-09 — Checkbox: Select All
**Steps:** Click header checkbox. **Expected:** All visible rows selected; indeterminate → checked state.

### TC-STFAPPT-10 — Checkbox: Deselect All
**Steps:** Click checked header checkbox. **Expected:** All deselected; bulk bar disappears.

### TC-STFAPPT-11 — Bulk Action Bar
**Steps:** Select 2 rows. **Expected:** "2 selected" text; "Cancel Selected" (error) and "Export" buttons shown. **BUG:** No handlers on these buttons.

### TC-STFAPPT-12 — Row Actions: Edit Icon
**Steps:** Click edit icon on any row. **Expected:** **BUG:** No onClick handler; nothing happens.

### TC-STFAPPT-13 — Row Actions: Cancel Icon
**Steps:** Click red cancel icon on a non-cancelled row. **Expected:** `setCancelTarget(appt.id)` fires; ConfirmDialog opens.

### TC-STFAPPT-14 — Row Actions: Cancel Icon Hidden for Cancelled
**Steps:** View the cancelled row. **Expected:** Red cancel icon not shown (`status !== 'cancelled'`).

### TC-STFAPPT-15 — Cancel: Confirm
**Steps:** Click "Cancel Appointment" in ConfirmDialog. **Expected:** `handleCancel` called; appointment status changes to "cancelled" in local state; cancel icon disappears.

### TC-STFAPPT-16 — Cancel: Dismiss
**Steps:** Click the close/cancel button in ConfirmDialog. **Expected:** `setCancelTarget(null)`; no state change; dialog closes.

### TC-STFAPPT-17 — Book Appointment Modal: Open
**Steps:** Click "Book Appointment". **Expected:** Dialog opens titled "Book Appointment" with all form fields.

### TC-STFAPPT-18 — Book Appointment Modal: Form Fields
**Steps:** View dialog. **Expected:** Patient field, Clinician field, Clinic dropdown, Room dropdown, Date picker, Time picker, Duration select (15/30/45/60 min), Service field, Reason textarea.

### TC-STFAPPT-19 — Book Appointment Modal: Submit
**Steps:** Fill fields; click "Book Appointment". **Expected:** Dialog closes (`setBookOpen(false)`); **BUG:** No mutation/save logic; form data lost; table not updated.

### TC-STFAPPT-20 — Book Appointment Modal: Cancel
**Steps:** Click "Cancel". **Expected:** Dialog closes; no changes.

### TC-STFAPPT-21 — Export CSV Button
**Steps:** Click "Export CSV". **Expected:** **BUG:** No onClick handler; nothing happens.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Search + Status filter combined | Both applied correctly (AND logic) |
| E2 | All rows cancelled | All cancel icons hidden; bulk "Cancel Selected" on already-cancelled rows has no handler |
| E3 | CheckAll → some filtered out | Only filtered rows selected |
| E4 | Table with 0 rows after filter | Empty table body; no explicit empty state message |
