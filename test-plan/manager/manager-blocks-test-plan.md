# Manager Blocks — Detailed Test Plan

**File:** `frontend/src/pages/manager/Blocks.jsx`
**Route:** `/manager/blocks`

---

## Feature Overview

Two-tab page for managing **Spacer Blocks** (blocks a specific clinician's time) and **Room Blocks** (blocks an entire room). Both support five recurrence patterns (single, daily, weekly, monthly, custom). Only creation and deletion are supported (no edit).

---

## Test Cases

### TC-MGR-BLK-01 — Page Load: Defaults to "Spacer Blocks" Tab
**Steps:** Navigate to `/manager/blocks`.
**Expected:**
- "Spacer Blocks" tab is active.
- Spacer blocks list (or empty state) is visible.
- Room Blocks tab button is visible but inactive.

---

### TC-MGR-BLK-02 — Tab Switch: Spacers ↔ Room Blocks
**Steps:**
1. Click "Room Blocks" toggle.
2. Click "Spacer Blocks" toggle.
**Expected:**
- Correct content renders for each tab.
- Switching tabs does NOT reset any open forms.
- URL or state is preserved via `tab` local state.

---

### TC-MGR-BLK-03 — Page Load: Spinner While Loading
**Steps:** Add network delay; navigate to the page.
**Expected:**
- `CircularProgress` shown while `loading && !data`.
- Content appears after data arrives.

---

### TC-MGR-BLK-04 — Spacer Blocks: Empty State
**Steps:** Ensure no spacer blocks exist.
**Expected:**
- Card with "No spacer blocks yet" message displayed.
- No list items visible.

---

### TC-MGR-BLK-05 — Spacer Blocks: Data Display
**Steps:** Ensure ≥1 spacer block exists.
**Expected:**
- Each card shows: Clinician name, Clinic name (·Room number if room assigned), Date+Time (12hr format), optional Reason, Recurrence chip.
- `fmt12` helper correctly converts 24hr to 12hr (e.g., `10:00 AM – 10:15 AM`).

---

### TC-MGR-BLK-06 — Spacer Block Form: Toggle Open/Close
**Steps:**
1. Click "Add Spacer Block".
2. Click again.
**Expected:**
- Form slides in / out (toggle behaviour).
- Form resets on re-open.

---

### TC-MGR-BLK-07 — Create Spacer Block: Single Recurrence (Happy Path)
**Steps:**
1. Select Clinician.
2. Select Clinic.
3. Set Recurrence = "Single".
4. Set Date = today.
5. Set Start Time = 10:00, End Time = 10:15.
6. Enter Reason = "Equipment setup".
7. Click "Create".
**Expected:**
- `createSpacerBlock` mutation fires with correct input.
- `block_date` is set; `recurrence_days` and `end_date` are null.
- Success message "Spacer block created." shown.
- New card appears in list.

---

### TC-MGR-BLK-08 — Create Spacer Block: Single — Date Field Required
**Steps:**
1. Set Recurrence = "Single".
2. Leave Date blank.
3. Click "Create".
**Expected:**
- Browser/MUI native required validation prevents submission.
- No mutation fires.

---

### TC-MGR-BLK-09 — Create Spacer Block: Daily Recurrence with End Date
**Steps:**
1. Select Clinician + Clinic.
2. Set Recurrence = "Daily", Start = 08:00, End = 08:30.
3. Set End Date = one month from now.
4. Click "Create".
**Expected:**
- `block_date` sent as `null`.
- `end_date` sent correctly.
- No `recurrence_days`.

---

### TC-MGR-BLK-10 — Create Spacer Block: Custom Recurrence — Day Selection
**Steps:**
1. Set Recurrence = "Custom Days".
2. Click "Mon", "Wed", "Fri" chips.
**Expected:**
- Selected chips show in `primary` colour.
- Unselected chips show in `default` colour.
- `recurrence_days = [1, 3, 5]` is stored in state.

---

### TC-MGR-BLK-11 — Spacer Block: Room Dropdown Filtered by Clinic
**Steps:**
1. Select Clinic A.
2. Verify Room dropdown shows Clinic A's rooms only.
3. Change to Clinic B.
**Expected:**
- Room options refresh based on selected clinic (`spacerRooms` computed from `allRooms.filter`).
- Room selection resets when clinic changes (via `useEffect`).

---

### TC-MGR-BLK-12 — Spacer Block: Room Dropdown Disabled Without Clinic
**Steps:**
1. Open form without selecting a clinic.
2. Observe Room dropdown.
**Expected:**
- Room dropdown is disabled (`disabled={!spacerForm.clinic_id}`).

---

### TC-MGR-BLK-13 — Delete Spacer Block: Confirm Dialog
**Steps:** Click delete icon on a spacer block card.
**Expected:**
- `ConfirmDialog` opens with "Delete Block" title.

---

### TC-MGR-BLK-14 — Delete Spacer Block: Confirm
**Steps:** Confirm deletion.
**Expected:**
- `deleteSpacerBlock` mutation fires with correct ID.
- "Block deleted." success message shown.
- Card removed from list.

---

### TC-MGR-BLK-15 — Delete Spacer Block: Cancel
**Steps:** Click delete, then Cancel.
**Expected:**
- Dialog closes; no mutation fires; card remains.

---

### TC-MGR-BLK-16 — Room Blocks Tab: Empty State
**Steps:** Navigate to Room Blocks tab with no records.
**Expected:**
- "No room blocks yet" message shown.

---

### TC-MGR-BLK-17 — Room Block Form: Room is Required (not optional)
**Description:** Unlike spacer blocks, room is required for room blocks.
**Steps:**
1. Select Clinic but leave Room unselected.
2. Click "Create".
**Expected:**
- `required` attribute on Room select prevents submission.
- Room select is disabled until a clinic is picked.

---

### TC-MGR-BLK-18 — Create Room Block: Single Recurrence (Happy Path)
**Steps:**
1. Select Clinic and then Room.
2. Set Recurrence = "Single", Date = today.
3. Set Start = 08:00, End = 09:00.
4. Enter Reason = "Deep cleaning".
5. Click "Create".
**Expected:**
- `createRoomBlock` mutation fires with `room_id`, `clinic_id`, `block_date`, times, reason.
- Success "Room block created." shown.
- Card added to Room Blocks list.

---

### TC-MGR-BLK-19 — Room Block: Room Dropdown Reset on Clinic Change
**Steps:**
1. Select Clinic A → select Room A-1.
2. Change Clinic to Clinic B.
**Expected:**
- `room_id` resets to `""`.
- Room dropdown shows Clinic B's rooms.

---

### TC-MGR-BLK-20 — Delete Room Block
**Steps:** Click delete on a room block card.
**Expected:**
- Correct type `'room'` is used in `handleDelete`.
- `deleteRoomBlock` mutation fires.
- "Block deleted." shown; card removed.

---

### TC-MGR-BLK-21 — Error Handling: Create Failure
**Steps:** Mock `createSpacerBlock` to return `userErrors`.
**Expected:**
- Error alert shows the `userErrors[0].message`.
- Form stays open.

---

### TC-MGR-BLK-22 — Success Alert Auto-Dismiss
**Steps:** Create a new block.
**Expected:**
- Success message disappears after 3 seconds.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | All clinicians inactive | Clinician dropdown is empty for spacer form |
| E2 | No active rooms in system | Room dropdowns remain empty |
| E3 | Custom recurrence with no days selected | `recurrence_days = []` sent to backend; backend may reject |
| E4 | Start time = End time | Backend should reject; userError shown |
| E5 | End time before Start time | Backend should reject; userError shown |
| E6 | End Date before today on weekly recurrence | Backend should reject |
| E7 | Reason field with very long text (500+ chars) | No truncation in form; display may clamp on card |
| E8 | Network failure during delete | `catch` sets `formError`; shown as red alert |
| E9 | Rapid-clicking "Add Spacer Block" | Toggle remains stable; form shown/hidden correctly |
| E10 | 500 spacer blocks loaded | List renders all; vertical scroll required |
| E11 | Block with no reason | Reason line not rendered on card |
| E12 | Block with null clinic | Clinic name renders as empty string; no crash |
| E13 | Switching tab while a form is open | Form is not preserved on the other tab (separate form state) |
