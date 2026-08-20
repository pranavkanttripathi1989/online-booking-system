---
id: TP016
type: test-plan
feature: manager-availability
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR015, TS015]
---

# Manager Availability — Detailed Test Plan

**File:** `frontend/src/pages/manager/Availability.jsx`  
**Route:** `/manager/availability`  
**Last Updated:** 2026-03-30

---

## Feature Overview

Page for creating, editing, and deleting clinician availability schedules. Supports four recurrence types (daily, weekly, monthly, custom), optional weekend exclusion rules, optional room assignment per clinic, and valid date ranges.

**Mock Mode:** App runs fully offline. `MOCK_AVAILABILITIES` (5 records), `MOCK_CLINICIANS_AV`, `MOCK_CLINICS_AV`, and `MOCK_ROOMS_BY_CLINIC` provide all data when backend is unavailable. Toggle: `VITE_USE_MOCK_API=true` in `.env`.

---

## Test Cases

### TC-MGR-AVAIL-01 — Page Load: Loading Spinner
**Description:** A `CircularProgress` spinner is shown while the initial query is loading.
**Steps:**
1. Navigate to `/manager/availability`.
**Expected:**
- Spinner is visible until data arrives.
- Header "Clinician Availability" + "Add Availability" button appear after loading.
- In offline/mock mode: 5 mock records appear in the table immediately.

---

### TC-MGR-AVAIL-02 — Empty State: No Availability Records
**Description:** An empty-state message is shown when no records exist.
**Steps:**
1. Temporarily set `MOCK_AVAILABILITIES = []` in `Availability.jsx`.
2. Navigate to the page.
**Expected:**
- Clock icon and "No availability records yet" message shown.
- No rows in the table.

---

### TC-MGR-AVAIL-03 — Availability Table: Data Display
**Description:** Each row shows clinician, clinic, time range, recurrence type (+day of week for weekly), valid period.
**Steps:**
1. Navigate to the page (with mock data active).
**Expected:**
- Columns: Clinician | Clinic | Time | Recurrence | Valid Period | Actions.
- `09:00 – 17:00` format shown.
- Weekly records show the day name (e.g., "Monday").
- James Okafor row shows "No weekends" warning chip (daily + excludeWeekends=true).
- Priya Sharma row shows "Always active" valid period (both dates null).
- Sarah Mitchell row shows "1/1/2026 → 12/31/2026" valid period range.

---

### TC-MGR-AVAIL-04 — Add Availability Form: Toggle Open/Close
**Description:** Clicking "Add Availability" toggles the inline form.
**Steps:**
1. Click "Add Availability".
2. Verify "New Availability" card appears.
3. Click "Cancel".
4. Verify form disappears completely.
5. Click "Add Availability" again.
6. Verify form opens in blank default state (not retaining previous session data).
**Expected:**
- Form appears → closes → opens fresh.
- Recurrence defaults to "Weekly", Start=09:00, End=17:00.

---

### TC-MGR-AVAIL-05 — Create: Required Fields Validation
**Description:** Clinician and Clinic are required; form cannot be submitted without them.
**Steps:**
1. Open new availability form.
2. Leave Clinician and Clinic dropdowns empty.
3. Click "Create".
**Expected:**
- Browser native validation or MUI `setFormError('Please select a clinician.')` fires.
- No mutation is fired.
- Form stays open.

---

### TC-MGR-AVAIL-06 — Create: Weekly Recurrence (Happy Path)
**Description:** Create a weekly availability with all required fields.
**Steps:**
1. Select a Clinician from mock dropdown.
2. Select a Clinic from mock dropdown.
3. Set Recurrence = "Weekly".
4. Select Day of Week = "Monday".
5. Set Start Time = 09:00, End Time = 17:00.
6. Set Valid From = today.
7. Click "Create".
**Expected:**
- With live backend: `createAvailability` mutation fires. Success alert "Availability created." for 3s. Form closes. New row in table.
- With backend offline: Network error shown in red alert above form. Form stays open.

---

### TC-MGR-AVAIL-07 — Weekly Recurrence: Day of Week Selector Visibility
**Description:** The "Day of Week" dropdown appears only when recurrence = "weekly".
**Steps:**
1. Set Recurrence to "Daily" → verify no Day of Week field.
2. Set Recurrence to "Weekly" → verify Day of Week field appears.
3. Set Recurrence to "Monthly" → verify no Day of Week field.
4. Set Recurrence to "Custom" → verify no Day of Week field and Custom Dates field appears.
**Expected:**
- Day of Week field visible only for "weekly".
- `day_of_week` value sent as `null` for non-weekly types.

---

### TC-MGR-AVAIL-08 — Custom Dates: Format Validation
**Description:** Invalid date format in custom dates field is caught by frontend validation before mutation fires.
**Steps:**
1. Open form.
2. Select a Clinician and Clinic.
3. Set Recurrence = "Custom".
4. Enter "foo, bar" in the Custom Dates field.
5. Click "Create".
**Expected:**
- Error alert: "Custom dates must be in YYYY-MM-DD format, separated by commas (e.g. 2026-04-01, 2026-04-15)."
- No mutation fires.
- Form stays open.
- **Valid input:** "2026-04-01, 2026-04-15" → passes validation, continues to mutation.

---

### TC-MGR-AVAIL-09 — Create: Daily Recurrence with Valid Period
**Description:** Create a daily availability with a valid from/until range.
**Steps:**
1. Select Clinician + Clinic.
2. Set Recurrence = "Daily", Start = 08:00, End = 12:00.
3. Set Valid From = 2026-04-01, Valid Until = 2026-04-30.
4. Click "Create".
**Expected:**
- Mutation input includes `valid_from` and `valid_until`.
- Record appears in table with "4/1/2026 → 4/30/2026" valid period.

---

### TC-MGR-AVAIL-10 — Room Optional: Disabled Without Clinic
**Description:** Room dropdown is disabled until a clinic is selected.
**Steps:**
1. Open the new availability form.
2. Observe the Room dropdown before selecting a clinic.
3. Select a clinic.
4. Observe the Room dropdown again.
**Expected:**
- Before clinic: Room shows "Any room" and is `aria-disabled="true"`.
- After clinic: Room becomes enabled and shows room options (mock or live).

---

### TC-MGR-AVAIL-11 — Room Assignment: Clinic Change Resets Room + Rooms Load
**Description:** Changing the selected clinic resets room selection and loads new clinic's rooms (offline fallback active).
**Steps:**
1. Select "Meridian Central" → verify room options load (Consultation A, B, Procedure Room 1).
2. Change clinic to "Meridian East" → verify room resets and new rooms load (Physio Suite, Consultation A).
**Expected:**
- Room dropdown resets to empty on clinic change.
- Correct mock rooms appear for each clinic.
- No stale room from previous clinic is retained.

---

### TC-MGR-AVAIL-12 — Exclude Weekends: Master Checkbox
**Description:** Checking "Exclude Weekends" auto-checks Saturday and Sunday sub-checkboxes.
**Steps:**
1. Open new availability form.
2. Check "Exclude Weekends (Sat & Sun)".
**Expected:**
- Both "Saturday" and "Sunday" sub-checkboxes appear checked.
- `exclude_weekends=true`, `exclude_saturday=true`, `exclude_sunday=true` in form state.

---

### TC-MGR-AVAIL-13 — Exclude Weekends: Unchecking One Day
**Description:** Un-checking Saturday while keeping Sunday should set `exclude_weekends = false`.
**Steps:**
1. Check "Exclude Weekends".
2. Uncheck "Saturday".
**Expected:**
- `exclude_saturday = false`.
- `exclude_weekends = false` (not both days excluded).
- `exclude_sunday` remains `true`.

---

### TC-MGR-AVAIL-14 — Edit: Pre-populate Form
**Description:** Clicking the edit icon populates the form with the existing record's data.
**Steps:**
1. Click the edit icon of "Sarah Mitchell" (weekly, Monday, 09:00–17:00, Meridian Central, 2026-01-01 → 2026-12-31).
**Expected:**
- Form title: "Edit Availability".
- All fields pre-filled: Clinician=Sarah Mitchell, Clinic=Meridian Central, Recurrence=Weekly, Day=Monday, Start=09:00, End=17:00, Valid From=2026-01-01, Valid Until=2026-12-31.
- "Update" button shown instead of "Create".

---

### TC-MGR-AVAIL-15 — Edit: Update Existing Record
**Description:** Modifying and saving updates the record.
**Steps:**
1. Open edit form for Sarah Mitchell.
2. Change End Time to 18:00.
3. Click "Update".
**Expected:**
- With live backend: `updateAvailability` mutation fires. "Availability updated." success message. Table row reflects new end time.
- With backend offline: "Failed to fetch" error shown in red alert above form. Form stays open.

---

### TC-MGR-AVAIL-16 — Edit: Backend Error Display
**Description:** If `updateAvailability` returns `userErrors` or network fails, the error is shown inline.
**Steps:**
1. Submit edit form with backend offline.
**Expected:**
- Red alert with error message above form.
- Form does not close.
- `editingId` stays set (form still in edit mode).

---

### TC-MGR-AVAIL-17 — Delete: Confirm Dialog
**Description:** Clicking the delete icon opens a confirmation dialog.
**Steps:**
1. Click the red delete icon on any row (e.g., Sarah Mitchell).
**Expected:**
- `ConfirmDialog` opens.
- Title: "Delete Availability".
- Message: "Are you sure you want to delete this availability record? This cannot be undone."
- Buttons: [Cancel] [Delete (red)].

---

### TC-MGR-AVAIL-18 — Delete: Confirm Action
**Description:** Confirming deletion removes the record.
**Steps:**
1. Open delete confirm dialog.
2. Click "Delete".
**Expected:**
- `deleteAvailability` mutation fires with the correct ID.
- Dialog closes.
- With live backend: "Availability deleted." shown. Record disappears after `refetch()`.
- With backend offline: Error shown, record stays.

---

### TC-MGR-AVAIL-19 — Delete: Cancel Action
**Description:** Cancelling the confirm dialog does NOT delete.
**Steps:**
1. Click delete icon.
2. Click "Cancel" in the dialog.
**Expected:**
- Dialog closes.
- Record remains in the table.
- No mutation fires.

---

### TC-MGR-AVAIL-20 — Delete: Backend Error Display
**Description:** If `deleteAvailability` fails, the error is shown.
**Steps:**
1. Confirm deletion with backend offline.
**Expected:**
- Error shown in a red alert.
- Record NOT removed from table (no optimistic removal).

---

### TC-MGR-AVAIL-21 — Cancel Button: Reset Form State
**Description:** Clicking Cancel clears the form and closes it without saving.
**Steps:**
1. Open edit form; make changes to a field (e.g., change recurrence).
2. Click "Cancel".
**Expected:**
- Form closes.
- `editingId` is nulled.
- No mutation fires.
- Table data unchanged.

---

### TC-MGR-AVAIL-22 — Success Message Auto-Dismiss
**Description:** Success alerts disappear after 3 seconds.
**Steps:**
1. Create or update a record (requires live backend).
2. Wait 3 seconds without manually closing the alert.
**Expected:**
- "Availability created." / "Availability updated." message vanishes automatically.
- `setTimeout(() => setSuccessMsg(null), 3000)` confirmed in source.

---

## New Test Cases (Added This Round)

---

### TC-MGR-AVAIL-23 — Validation: Start Time Equal to End Time
**Description:** Frontend blocks submission when start and end time are identical.
**Steps:**
1. Open form. Select Clinician + Clinic.
2. Set Start Time = End Time = 09:00.
3. Click "Create".
**Expected:**
- Error alert: "End time must be after start time."
- No mutation fires.
**Edge Case From:** E3

---

### TC-MGR-AVAIL-24 — Validation: End Time Before Start Time
**Description:** Frontend blocks submission when end time is earlier than start time.
**Steps:**
1. Open form. Select Clinician + Clinic.
2. Set Start Time = 10:00, End Time = 09:00.
3. Click "Create".
**Expected:**
- Error alert: "End time must be after start time."
- No mutation fires.
**Edge Case From:** E4

---

### TC-MGR-AVAIL-25 — Validation: Valid Until Before Valid From
**Description:** Frontend blocks submission when Valid Until is before Valid From.
**Steps:**
1. Open form. Select Clinician + Clinic.
2. Set Valid From = 2026-04-01, Valid Until = 2026-03-01.
3. Click "Create".
**Expected:**
- Error alert: "\"Valid Until\" cannot be before \"Valid From\"."
- No mutation fires.
**Edge Case From:** E5

---

### TC-MGR-AVAIL-26 — Table: Horizontal Scroll with Many Rows (Layout Integrity)
**Description:** Table does not break layout when many records are loaded.
**Steps:**
1. Temporarily expand `MOCK_AVAILABILITIES` to 20+ records in `Availability.jsx`.
2. Navigate to the page.
3. Observe table layout at 1440px and 768px viewport widths.
**Expected:**
- Table renders all rows without horizontal overflow breaking the page layout.
- `overflowX: 'auto'` wrapper provides scrollable container.
- No columns collapse or overlap.
**Edge Case From:** E11

---

### TC-MGR-AVAIL-27 — Form State Reset After Tab Navigation
**Description:** Form opens in default state after navigating away and returning to the page.
**Steps:**
1. Open "New Availability" form and partially fill it (e.g., set Recurrence = Daily, check Exclude Weekends).
2. Navigate to `/manager/services` or `/manager/dashboard`.
3. Return to `/manager/availability`.
4. Click "+ Add Availability".
**Expected:**
- Form opens in default state: Recurrence=Weekly, Exclude Weekends=unchecked, Start=09:00, End=17:00.
- Previous partial input is not retained.
- Table shows all 5 mock rows (no data loss).
**Edge Case From:** E10 / SUG-AVAIL-013

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | `clinicians` list empty (all inactive) | Clinician dropdown is empty; form cannot be submitted (required guard fires) |
| E2 | `clinics` list empty | Clinic dropdown is empty; form cannot be submitted |
| E3 | Start time = End time (09:00 – 09:00) | **Frontend error:** "End time must be after start time." — no backend round-trip (see TC-23) |
| E4 | End time before Start time | **Frontend error:** same guard (see TC-24) |
| E5 | Valid Until before Valid From | **Frontend error:** "Valid Until cannot be before Valid From." (see TC-25) |
| E6 | Custom dates field empty when recurrence=custom | `custom_dates` sent as `null` to backend (empty string → null via `form.custom_dates \|\| null`) |
| E7 | Custom dates with invalid format (e.g., "foo") | **Frontend format validation (NEW):** error shown before mutation fires (see TC-08) |
| E8 | Editing an inactive availability | Form pre-fills correctly; no toggle in form (active status not editable via this form) |
| E9 | Network failure during create | `catch` block sets `formError`; shown in red alert above form |
| E10 | Switching tabs and returning | Form resets to default state on re-open (see TC-27) |
| E11 | 200+ records loaded | Table scrolls horizontally; no layout breaks (see TC-26) |
| E12 | Record with null clinicianId | `avail.clinician?.firstName` — optional chaining prevents crash; empty string renders safely |
