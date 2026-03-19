# Clinician Availability — Test Plan

**Route:** `/clinician/availability`  
**File:** `frontend/src/pages/clinician/Availability.jsx`  
**Status:** ✅ Updated — 2026-03-19 (Session 3 QA)

---

## Feature Overview

7-column weekly grid showing availability slots and lunch breaks. Right-side drawer for create/edit with recurrence, day selector (Mon–Sun with disambiguated labels, persists across recurrence-type changes), time block, room, validity period, overlap detection (shows conflicting slot times). Second drawer for lunch break management (with styled empty state). Mutations: `SAVE_AVAILABILITY`, `DELETE_AVAILABILITY`, `SAVE_LUNCH_BREAK`, `DELETE_LUNCH_BREAK`. Delete actions use MUI ConfirmDialog (not native confirm). Drawer auto-closes after successful delete. Both drawers use flex-column layout for sticky action buttons. Mock fallback with `_type`-tagged items shown when backend offline.

---

## Core Test Cases (TC-CLAVAIL-01 to TC-CLAVAIL-18)

### TC-CLAVAIL-01 — Page Load: Loading State
**Steps:** Navigate before query resolves.  
**Expected:** `CircularProgress` shown centred, minimum 300ms visible.

### TC-CLAVAIL-02 — Page Load: Mock Fallback on Error
**Steps:** Navigate with backend offline.  
**Expected:** Soft yellow/warning `<Alert>` shown at top with "Offline mode" + Retry button. 7-day grid WITH mock data visible below. No full-page error block.

### TC-CLAVAIL-03 — 7-Day Grid
**Steps:** Page loads with data.  
**Expected:** 7 columns (Mon–Sun), slots shown in blue (`_type: 'slot'`), lunch breaks in amber (`_type: 'lunch'`), "Add Slot" button per column.

### TC-CLAVAIL-04 — Slot Click Opens Edit Drawer
**Steps:** Click an existing slot.  
**Expected:** Drawer opens titled "Edit Slot" with form pre-filled from slot data.

### TC-CLAVAIL-05 — Add Slot Button Opens New Drawer
**Steps:** Click "Add Slot" in column.  
**Expected:** Drawer titled "New Availability Slot"; day pre-set to column index; Weekly recurrence default.

### TC-CLAVAIL-06 — Recurrence: Weekly Shows Day Selector
**Steps:** Select "Weekly".  
**Expected:** 7-button ToggleButtonGroup (M/Tu/W/Th/F/Sa/Su) shown; exclusive selection; tooltips showing full day name.

### TC-CLAVAIL-07 — Recurrence: Once/Daily/Monthly Hides Day Selector
**Steps:** Select each.  
**Expected:** Day ToggleButtonGroup hidden.

### TC-CLAVAIL-08 — End Time Validation
**Steps:** Set end time before start time.  
**Expected:** Alert "End time must be after start time" shown; Save button disabled.

### TC-CLAVAIL-09 — Save New Slot
**Steps:** Submit valid form.  
**Expected:** `SAVE_AVAILABILITY` mutation fires (no `id`); `refetch()` awaited; drawer closes; success snackbar shown.

### TC-CLAVAIL-10 — Save Edit Slot
**Steps:** Edit existing slot; submit.  
**Expected:** `input.id = editSlot.id` included; mutation fires as update; success snackbar shown.

### TC-CLAVAIL-11 — Save Error → Notistack Snackbar
**Steps:** Mock mutation error.  
**Expected:** notistack `error` snackbar shown; drawer stays open; saving=false.

### TC-CLAVAIL-12 — Delete: MUI ConfirmDialog
**Steps:** Click "Delete" in edit drawer.  
**Expected:** MUI ConfirmDialog opens. No `window.confirm()` call.

### TC-CLAVAIL-13 — Delete: Confirm → Removes Slot + Closes Drawer
**Steps:** Confirm in ConfirmDialog.  
**Expected:** `DELETE_AVAILABILITY` fires; `refetch()` awaited; slot removed; **drawer auto-closes**; info snackbar shown.

### TC-CLAVAIL-14 — Delete: Cancel → No Action
**Steps:** Cancel in ConfirmDialog.  
**Expected:** No mutation; drawer stays open.

### TC-CLAVAIL-15 — Validity Range: Hidden for Once
**Steps:** Select "Once" recurrence.  
**Expected:** Valid From/Until pickers hidden.

### TC-CLAVAIL-16 — Validity Range + Exclude Weekends (Daily)
**Steps:** Select "Daily".  
**Expected:** Validity pickers shown; Exclude Weekends switch shown.

### TC-CLAVAIL-17 — Lunch Breaks Section
**Steps:** View bottom panel.  
**Expected:** Lunch breaks listed with time, recurrence; "Add Break" button + edit/delete icons — all functional. Empty state with icon + "Add First Break" button when list is empty.

### TC-CLAVAIL-18 — Lunch Break Actions Functional
**Steps:** Click "Add Break", then Edit icon, then Delete icon.  
**Expected:** "Add Break" → lunch drawer (new); Edit → lunch drawer (pre-filled); Delete → ConfirmDialog. All handlers wired.

---

## Session 2 Test Cases (TC-CLAVAIL-19 to TC-CLAVAIL-31)

### TC-CLAVAIL-19 — Mock Data Grid Visible When Backend Offline
**Steps:** Navigate to `/clinician/availability` with backend offline.  
**Expected:** 7-day grid renders with 5 mock slots (Mon–Fri). Lunch section shows 1 daily break.

### TC-CLAVAIL-20 — Soft Warning Banner
**Steps:** Backend offline.  
**Expected:** Yellow warning Alert visible at top; grid + lunch panel accessible. "Retry" button present.

### TC-CLAVAIL-21 — Lunch Break "Add Break" Opens Drawer
**Steps:** Click "Add Break" button.  
**Expected:** Drawer opens titled "New Lunch Break" with "Every Day" pre-selected, 12:30–13:30 defaults.

### TC-CLAVAIL-22 — Lunch Break Edit Opens Pre-filled Drawer
**Steps:** Click Edit icon on existing break.  
**Expected:** Drawer titled "Edit Lunch Break" with break's day, start/end times pre-filled.

### TC-CLAVAIL-23 — Lunch Break Delete → ConfirmDialog → Closes Drawer
**Steps:** Click Delete icon; confirm.  
**Expected:** `DELETE_LUNCH_BREAK` fires; break removed; **lunch drawer auto-closes if editing deleted item**; info snackbar.

### TC-CLAVAIL-24 — Save Error → notistack (not window.alert)
**Steps:** Mock `SAVE_AVAILABILITY` to throw error; click Save.  
**Expected:** Error snackbar shown. No `window.alert()`.

### TC-CLAVAIL-25 — Delete → MUI ConfirmDialog (not window.confirm)
**Steps:** Open edit drawer; click Delete.  
**Expected:** MUI Dialog component visible. No `window.confirm`.

### TC-CLAVAIL-26 — Valid Until < Valid From → Inline Error + Save Disabled
**Steps:** Set valid_from = March 20, valid_until = March 10.  
**Expected:** Red Alert shown; Save Slot button disabled.

### TC-CLAVAIL-27 — Overlapping Slots → Non-blocking Warning with Detail
**Steps:** Add a slot Mon 09:00–17:00 when one exists.  
**Expected:** Yellow warning Alert showing conflicting slot's times (e.g., "Overlaps with 09:00–17:00 Mon"). Save NOT disabled.

### TC-CLAVAIL-28 — Day Selector Labels: Tu/Th/Sa/Su
**Steps:** Open drawer with Weekly; observe ToggleButtons.  
**Expected:** M, Tu, W, Th, F, Sa, Su labels visible.

### TC-CLAVAIL-29 — Day Button Tooltip Shows Full Day Name
**Steps:** Hover each day button.  
**Expected:** "Monday", "Tuesday", ..., "Sunday" shown in MUI Tooltip.

### TC-CLAVAIL-30 — Sidebar Has "My Availability" Link for Clinician
**Steps:** Log in as Clinician; open sidebar.  
**Expected:** "My Availability" link visible in sidebar (AppShell.jsx NAV_CONFIG + Sidebar.jsx). NOT visible for Admin/Receptionist.

### TC-CLAVAIL-31 — Minimum Spinner Visible (300ms)
**Steps:** Navigate to availability page.  
**Expected:** CircularProgress visible ≥300ms before transition.

---

## Session 3 Test Cases (TC-CLAVAIL-32 to TC-CLAVAIL-38)

### TC-CLAVAIL-32 — Lunch Break Empty State (Styled)
**Steps:** Remove all lunch breaks or test with empty MOCK_LUNCHES.  
**Expected:** Styled empty state with: `Alarm` icon (greyed), "No lunch breaks configured" heading, descriptive subtitle, "Add First Break" outlined button.

### TC-CLAVAIL-33 — Overlap Warning Shows Conflicting Slot Times
**Steps:** Enter times overlapping Mon 09:00–17:00.  
**Expected:** Warning includes specific times: "Overlaps with existing slot 09:00–17:00 (Mon). You can still save."

### TC-CLAVAIL-34 — Day Persists When Switching Recurrence
**Steps:** Select "Tu" in Weekly; switch to Daily; switch back to Weekly.  
**Expected:** "Tu" remains selected after returning to Weekly.

### TC-CLAVAIL-35 — Drawer Action Buttons Sticky at Bottom
**Steps:** Open drawer on small viewport; scroll form content.  
**Expected:** Save/Cancel buttons visible at bottom. Form content scrolls independently.

### TC-CLAVAIL-36 — Dead Imports Not Present
**Steps:** Review Availability.jsx imports.  
**Expected:** `useRef` NOT in React import; `EventAvailableRounded` NOT in icon import.

### TC-CLAVAIL-37 — Reliable Lunch Type Detection
**Steps:** Confirm grid renders with API data; lunches appear as amber, slots as blue.  
**Expected:** `_type` field used for detection. No `id.includes('lunch')` heuristic.

### TC-CLAVAIL-38 — Lunch Delete Closes Drawer After Confirm
**Steps:** Open Edit Lunch drawer; click Delete; confirm.  
**Expected:** Lunch drawer closes automatically; success snackbar shown.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | No rooms from GET_ROOMS | Dropdown shows only placeholder; null guard prevents blank label |
| E2 | No clinicId | GET_ROOMS skipped; empty room list |
| E3 | Valid Until before Valid From | `isDateRangeInvalid` → inline Alert + Save disabled |
| E4 | Overlapping slots | `findOverlap()` returns conflict; non-blocking warning with times shown |
| E5 | Close drawer without saving | No unsaved-change warning (documented gap; deferred) |
| E6 | Lunch end before start | `isLunchEndBeforeStart` → Alert shown; Save Break disabled |
| E7 | No break ID on save (new break) | `id` field omitted from mutation input |
| E8 | Empty lunch list | Styled empty state with icon + "Add First Break" CTA |
| E9 | Recurrence switch loses day | `handleRecurrenceChange()` preserves `day_of_week` |

---

## Summary

| TC Range | Count | Status |
|----------|-------|--------|
| TC-CLAVAIL-01 to TC-CLAVAIL-18 | 18 | ✅ Updated (Session 2 + 3) |
| TC-CLAVAIL-19 to TC-CLAVAIL-31 | 13 | ✅ Added Session 2 |
| TC-CLAVAIL-32 to TC-CLAVAIL-38 | 7  | ✅ Added Session 3 |
| Edge cases (E1–E9) | 9 | ✅ 8 resolved, 1 deferred (E5) |
