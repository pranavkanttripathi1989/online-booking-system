# Clinician Availability — Test Plan

**Route:** `/clinician/availability`
**File:** `frontend/src/pages/clinician/Availability.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

7-column weekly grid showing availability slots and lunch breaks. Right-side drawer for create/edit with recurrence, day selector, time block, room, validity period. Mutations: `SAVE_AVAILABILITY`, `DELETE_AVAILABILITY`. Delete uses `window.confirm`.

---

## Test Cases

### TC-CLAVAIL-01 — Page Load: Loading State
**Steps:** Navigate before query resolves. **Expected:** `CircularProgress` shown centred.

### TC-CLAVAIL-02 — Page Load: Error State
**Steps:** Mock query error. **Expected:** `Alert severity="error"` shown.

### TC-CLAVAIL-03 — 7-Day Grid
**Steps:** Page loads with data. **Expected:** 7 columns (Mon–Sun), slots shown in blue, lunch breaks in amber, "Add Slot" button per column.

### TC-CLAVAIL-04 — Slot Click Opens Edit Drawer
**Steps:** Click an existing slot. **Expected:** Drawer opens titled "Edit Slot" with form pre-filled from slot data.

### TC-CLAVAIL-05 — Add Slot Button Opens New Drawer
**Steps:** Click "Add Slot" in column. **Expected:** Drawer titled "New Availability Slot"; day pre-set to column index; Weekly recurrence default.

### TC-CLAVAIL-06 — Recurrence: Weekly Shows Day Selector
**Steps:** Select "Weekly". **Expected:** 7-button ToggleButtonGroup (M/T/W/T/F/S/S) shown; exclusive selection.

### TC-CLAVAIL-07 — Recurrence: Once/Daily/Monthly Hides Day Selector
**Steps:** Select each. **Expected:** Day ToggleButtonGroup hidden.

### TC-CLAVAIL-08 — End Time Validation
**Steps:** Set end time before start time. **Expected:** Alert "End time must be after start time" shown; Save button disabled.

### TC-CLAVAIL-09 — Save New Slot
**Steps:** Submit valid form. **Expected:** `SAVE_AVAILABILITY` mutation fires (no `id`); drawer closes; grid refetches.

### TC-CLAVAIL-10 — Save Edit Slot
**Steps:** Edit existing slot; submit. **Expected:** `input.id = editSlot.id` included; mutation fires as update.

### TC-CLAVAIL-11 — Save Error
**Steps:** Mock mutation error. **Expected:** `alert(...)` shown; saving=false; drawer stays open.

### TC-CLAVAIL-12 — Delete: Confirm Dialog
**Steps:** Click "Delete" in edit drawer. **Expected:** `window.confirm("Delete this availability slot?")` appears.

### TC-CLAVAIL-13 — Delete: OK
**Steps:** Confirm delete. **Expected:** `DELETE_AVAILABILITY` fires; grid refetches; slot removed; drawer closes.

### TC-CLAVAIL-14 — Delete: Cancel
**Steps:** Cancel in confirm dialog. **Expected:** No mutation; drawer stays open.

### TC-CLAVAIL-15 — Validity Range: Hidden for Once
**Steps:** Select "Once" recurrence. **Expected:** Valid From/Until pickers hidden.

### TC-CLAVAIL-16 — Validity Range + Exclude Weekends (Daily)
**Steps:** Select "Daily". **Expected:** Validity pickers shown; Exclude Weekends switch shown.

### TC-CLAVAIL-17 — Lunch Breaks Section
**Steps:** View bottom panel. **Expected:** Lunch breaks listed with time, recurrence; Add Break + edit/delete icons present.

### TC-CLAVAIL-18 — Lunch Break Actions (No Handlers)
**Steps:** Click Add Break, edit, and delete icons. **Expected:** **BUG:** No onClick handlers. Enhancement needed for all three.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | No rooms from GET_ROOMS | Dropdown empty (only placeholder) |
| E2 | No clinicId | GET_ROOMS skipped; empty room list |
| E3 | Valid Until before Valid From | No frontend validation; backend should reject |
| E4 | Overlapping slots | No frontend conflict detection |
| E5 | Close drawer without saving | No unsaved-change warning |
