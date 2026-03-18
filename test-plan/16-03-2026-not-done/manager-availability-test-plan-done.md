# Manager Availability — Detailed Test Plan

**File:** `frontend/src/pages/manager/Availability.jsx`
**Route:** `/manager/availability`

---

## Feature Overview

Page for creating, editing, and deleting clinician availability schedules. Supports four recurrence types (daily, weekly, monthly, custom), optional weekend exclusion rules, optional room assignment per clinic, and valid date ranges.

---

## Test Cases

### TC-MGR-AVAIL-01 — Page Load: Loading Spinner
**Description:** A `CircularProgress` spinner is shown while the initial query is loading.
**Steps:**
1. Navigate to `/manager/availability`.
**Expected:**
- Spinner is visible until data arrives.
- Header + "Add Availability" button appear after loading.

---

### TC-MGR-AVAIL-02 — Empty State: No Availability Records
**Description:** An empty-state message is shown when no records exist.
**Steps:**
1. Ensure no availability records exist in the backend.
2. Navigate to the page.
**Expected:**
- Clock icon and "No availability records yet" message shown.
- No rows in the table.

---

### TC-MGR-AVAIL-03 — Availability Table: Data Display
**Description:** Each row shows clinician, clinic, time range, recurrence type (+day of week for weekly), valid period.
**Steps:**
1. Ensure ≥1 availability record exists.
2. Navigate to the page.
**Expected:**
- Columns: Clinician | Clinic | Time | Recurrence | Valid Period | Actions.
- `07:00 – 09:00` format verified.
- Weekly records show the day name (e.g., "Monday").
- If `excludeWeekends=true`, a "No weekends" warning chip is shown.
- Valid period shows "Always active" if both dates are null, "From {date}" if only `validFrom` set, or "{from} → {until}" if both set.

---

### TC-MGR-AVAIL-04 — Add Availability Form: Toggle Open/Close
**Description:** Clicking "Add Availability" toggles the inline form.
**Steps:**
1. Click "Add Availability".
2. Click "Add Availability" again.
**Expected:**
- Form appears on first click.
- Form disappears on second click.
- Form is reset each time it opens (not carrying data from a previous session).

---

### TC-MGR-AVAIL-05 — Create: Required Fields Validation
**Description:** Clinician and Clinic are required; form cannot be submitted without them.
**Steps:**
1. Open new availability form.
2. Leave Clinician and Clinic dropdowns empty.
3. Click "Create".
**Expected:**
- Browser or MUI required field validation prevents submission.
- No mutation is fired.

---

### TC-MGR-AVAIL-06 — Create: Weekly Recurrence (Happy Path)
**Description:** Create a weekly availability with all required fields.
**Steps:**
1. Select a Clinician.
2. Select a Clinic.
3. Set Recurrence = "Weekly".
4. Select Day of Week = "Monday".
5. Set Start Time = 09:00, End Time = 17:00.
6. Set Valid From = today.
7. Click "Create".
**Expected:**
- `createAvailability` mutation fires with correct input.
- Success alert "Availability created." is shown for 3 seconds.
- Form closes and new record appears in the table.

---

### TC-MGR-AVAIL-07 — Weekly Recurrence: Day of Week Selector Visibility
**Description:** The "Day of Week" dropdown appears only when recurrence = "weekly".
**Steps:**
1. Set Recurrence to "Daily" → verify no Day of Week field.
2. Set Recurrence to "Weekly" → verify Day of Week field appears.
3. Set Recurrence to "Monthly" → verify no Day of Week field.
4. Set Recurrence to "Custom" → verify no Day of Week field.
**Expected:**
- Day of Week field visible only for "weekly".
- `day_of_week` value sent as `null` for non-weekly types.

---

### TC-MGR-AVAIL-08 — Custom Recurrence: Custom Dates Field
**Description:** Setting recurrence to "custom" reveals a text field for comma-separated dates.
**Steps:**
1. Set Recurrence = "Custom".
2. Enter custom dates (e.g., `2026-04-01, 2026-04-15`).
**Expected:**
- Textarea appears with placeholder hint.
- These dates are sent in `custom_dates` mutation input.

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
- Record appears in table with "01/04/2026 → 30/04/2026" valid period.

---

### TC-MGR-AVAIL-10 — Room Optional: Disabled Without Clinic
**Description:** Room dropdown is disabled until a clinic is selected.
**Steps:**
1. Open the new availability form.
2. Observe the Room dropdown before selecting a clinic.
**Expected:**
- Room dropdown shows "Any room" and is disabled.
- After selecting a clinic, dropdown becomes enabled (though may still be empty if no rooms loaded).

---

### TC-MGR-AVAIL-11 — Room Assignment: Clinic Changes Reset Room
**Description:** Changing the selected clinic should clear the currently selected room.
**Steps:**
1. Select Clinic A and Room A-1.
2. Change clinic to Clinic B.
**Expected:**
- Room dropdown resets to empty/`""` state.
- Room options update to Clinic B's rooms.

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
- `exclude_weekends = false` (since not both are excluded).
- `exclude_sunday` remains `true`.

---

### TC-MGR-AVAIL-14 — Edit: Pre-populate Form
**Description:** Clicking the edit icon populates the form with the existing record's data.
**Steps:**
1. Click the edit icon of a weekly availability record.
**Expected:**
- Form opens in "Edit" mode (title shows "Edit Availability").
- Clinician, Clinic, Day of Week, Start/End times, Valid From/Until are pre-filled.
- "Update" button shown instead of "Create".

---

### TC-MGR-AVAIL-15 — Edit: Update Existing Record
**Description:** Modifying and saving updates the record.
**Steps:**
1. Open edit form for an existing record.
2. Change End Time to 18:00.
3. Click "Update".
**Expected:**
- `updateAvailability` mutation fires with `id` and updated input.
- Success message "Availability updated." shown.
- Table row reflects the new end time.

---

### TC-MGR-AVAIL-16 — Edit: Backend Error Display
**Description:** If `updateAvailability` returns `userErrors`, the error is shown inline.
**Steps:**
1. Mock the mutation to return `userErrors: [{ message: "Overlap detected" }]`.
2. Submit the edit form.
**Expected:**
- Red alert showing "Overlap detected" appears above the form.
- Form does not close.

---

### TC-MGR-AVAIL-17 — Delete: Confirm Dialog
**Description:** Clicking the delete icon opens a confirmation dialog.
**Steps:**
1. Click the red delete icon on any row.
**Expected:**
- `ConfirmDialog` opens with title "Delete Availability" and message about permanence.

---

### TC-MGR-AVAIL-18 — Delete: Confirm Action
**Description:** Confirming deletion removes the record.
**Steps:**
1. Open delete confirm dialog.
2. Click "Confirm".
**Expected:**
- `deleteAvailability` mutation fires with the correct ID.
- Dialog closes.
- Success message "Availability deleted." shown.
- Record disappears from the table after `refetch()`.

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
**Description:** If `deleteAvailability` returns `userErrors`, the error is shown.
**Steps:**
1. Mock mutation to return `userErrors: [{ message: "Cannot delete active schedule" }]`.
2. Confirm deletion.
**Expected:**
- Error shown in a red alert.
- Record NOT removed from table.

---

### TC-MGR-AVAIL-21 — Cancel Button: Reset Form State
**Description:** Clicking Cancel clears the form and closes it without saving.
**Steps:**
1. Open edit form; make changes.
2. Click "Cancel".
**Expected:**
- Form closes.
- `editingId` is nulled.
- No mutation fires.
- Original table data unchanged.

---

### TC-MGR-AVAIL-22 — Success Message Auto-Dismiss
**Description:** Success alerts disappear after 3 seconds.
**Steps:**
1. Create a new availability.
2. Wait 3 seconds.
**Expected:**
- "Availability created." message vanishes automatically.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | `clinicians` list is empty (all inactive) | Clinician dropdown is empty; form cannot be submitted |
| E2 | `clinics` list is empty | Clinic dropdown is empty; form cannot be submitted |
| E3 | Start time = End time (e.g., 09:00 – 09:00) | Backend should reject; frontend shows userError msg |
| E4 | End time before Start time | Backend should reject; userError message shown |
| E5 | Valid Until before Valid From | No front-end validation; backend should reject it |
| E6 | Custom dates field is empty when recurrence=custom | `custom_dates` sent as `null` to backend |
| E7 | Custom dates with invalid format (e.g., `foo`) | Backend rejects; userError message shown |
| E8 | Editing an inactive availability | Form pre-fills correctly; toggle is not available (no toggle in form) |
| E9 | Network failure during create | `catch` block sets `formError`; shown in red alert |
| E10 | Opening form then switching tabs and back | Form is still open in same state |
| E11 | 200+ records loaded | Table scrolls horizontally; no layout breaks |
| E12 | Record with null clinicianId | Clinician cell renders empty string gracefully |
