# Clinician Patients — Test Plan

**Route:** `/clinician/patients`
**File:** `frontend/src/pages/clinician/Patients.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

A static list of the clinician's assigned patients. Supports search (name/email) and status filter (all/active/new/inactive). KPI cards at top. Table with patient details and action buttons to view patient profile and book a new appointment.

---

## Test Cases

### TC-CLPAT-01 — Page Load
**Steps:** Navigate to `/clinician/patients`. **Expected:** Title "My Patients"; 5 patients shown; subtitle "{N} patients · {M} with upcoming appointments".

### TC-CLPAT-02 — KPI Cards
**Steps:** View stat cards. **Expected:** Total Patients=5, Active=2, New This Month=1, Upcoming Appts=2 (patients with non-null `nextAppt`).

### TC-CLPAT-03 — Search: By Name
**Steps:** Type "Emma" in search field. **Expected:** Only Emma Wilson row shown (case-insensitive match on `name`).

### TC-CLPAT-04 — Search: By Email
**Steps:** Type "lily@email.com". **Expected:** Only Lily Chen row shown.

### TC-CLPAT-05 — Search: No Results
**Steps:** Type "xyz123". **Expected:** Empty table body (no rows, no explicit empty state component).

### TC-CLPAT-06 — Filter: Active
**Steps:** Click "Active" chip. **Expected:** Shows 2 patients (Emma Wilson, James Brown); chip highlighted as primary.

### TC-CLPAT-07 — Filter: New
**Steps:** Click "New" chip. **Expected:** Shows 1 patient (Lily Chen).

### TC-CLPAT-08 — Filter: Inactive
**Steps:** Click "Inactive" chip. **Expected:** Shows 1 patient (Sophie Müller).

### TC-CLPAT-09 — Filter: All (Default)
**Steps:** Click "All" chip. **Expected:** All 5 patients shown.

### TC-CLPAT-10 — Filter + Search Combined
**Steps:** Filter=Active; search="Emma". **Expected:** Only Emma Wilson shown (active AND matches name).

### TC-CLPAT-11 — Table: Condition Chip
**Steps:** View rows with and without conditions. **Expected:** Patients with a condition → warning-colour outlined chip; patients with "—" → grey typography.

### TC-CLPAT-12 — Table: Next Appointment
**Steps:** View patients with/without nextAppt. **Expected:** With nextAppt → green CalendarMonthIcon + date in green. Without → "None" in grey.

### TC-CLPAT-13 — Table: Total Visits
**Steps:** View the Visits column. **Expected:** Visit count shown as a chip with `bgcolor: '#E8F8F9'`.

### TC-CLPAT-14 — Table: Status Chip Colours
**Steps:** View Status column for each patient. **Expected:** active=#D1FAE5/#065F46; new=#DBEAFE/#1E40AF; inactive=#F3F4F6/#6B7280.

### TC-CLPAT-15 — Action: View Patient
**Steps:** Click the eye icon. **Expected:** Navigates to `/patients/:patient.id`.

### TC-CLPAT-16 — Action: Book Appointment
**Steps:** Click the calendar icon. **Expected:** Navigates to `/appointments/book`.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | 0 patients in PATIENTS array | Table empty; KPI cards all show 0 |
| E2 | Search clears to empty | All patients shown again |
| E3 | Filter chip active + search returns 0 | Empty table body; no explicit empty state |
| E4 | Patient email undefined | Email cell shows `undefined` — Edge: null guard needed |
