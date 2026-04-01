# Manager Blocks — Detailed Test Plan

**File:** `frontend/src/pages/manager/Blocks.jsx`  
**Route:** `/manager/blocks`  
**Last Updated:** 2026-03-30

---

## Feature Overview

Two-tab page (ToggleButtonGroup) for **Spacer Blocks** (clinician time slot blocks) and **Room Blocks** (entire room blocks). Both support five recurrence patterns: single, daily, weekly, monthly, custom. Switching tabs closes and resets any open form. Only creation and deletion supported (no edit).

> **Mock Mode:** `MOCK_SPACER_BLOCKS` (5 records) + `MOCK_ROOM_BLOCKS` (3 records) when backend offline. Form dropdowns: `MOCK_CLINICIANS`, `MOCK_CLINICS`, `MOCK_ROOMS`.

---

## Test Cases

### TC-MGR-BLK-01 — Page Load: Defaults to "Spacer Blocks" Tab
**Steps:** Navigate to `/manager/blocks`.  
**Expected:**
- "Schedule Blocks" h5 heading + subtitle.
- ToggleButtonGroup: "Spacer Blocks" (active), "Room Blocks" (inactive).
- 5 mock spacer block cards visible (offline mode).

---

### TC-MGR-BLK-02 — Tab Switch: Spacers ↔ Room Blocks
**Steps:** Click "Room Blocks" → "Spacer Blocks".  
**Expected:**
- Correct content renders per tab.
- **Switching tabs automatically closes + resets any open create form.**

---

### TC-MGR-BLK-03 — Loading Spinner
**Steps:** Add network delay, navigate to page.  
**Expected:** `CircularProgress` shown while `loading && !data`.

---

### TC-MGR-BLK-04 — Spacer Blocks: Empty State
**Steps:** View Spacer Blocks tab with no records.  
**Expected:** Centered "No spacer blocks yet" text in a Card.

---

### TC-MGR-BLK-05 — Spacer Blocks: Data Display
**Steps:** View 5 mock spacer block cards.  
**Expected:**
- Each card: clinician (bold), clinic·room (if room assigned), 12hr time, optional reason, recurrence chip (capitalized).
- `fmt12()` converts 24hr → 12hr correctly (e.g., "10:00" → "10:00 AM", "14:00" → "2:00 PM").

---

### TC-MGR-BLK-06 — Spacer Block Form: Toggle Open/Close
**Steps:** Click "Add Spacer Block" → Click "Cancel".  
**Expected:**
- Form: Clinician* / Clinic* / Room(optional) / Recurrence / Date or End Date / Start + End Time / Reason "0/500" counter / Create + Cancel.
- Cancel: collapses form, all fields reset to defaults.

---

### TC-MGR-BLK-07 — Create Spacer Block: Single (Happy Path)
**Steps:** Clinician + Clinic + Recurrence=Single + Date + Times + Reason → Create.  
**Expected:** Mutation fires: `block_date` set, `recurrence_days: null`. "Spacer block created." shown. Form closes.

---

### TC-MGR-BLK-08 — Create: Date Field Required (Single)
**Steps:** Recurrence=Single, Date blank → Create.  
**Expected:** Native browser "Please fill out this field" on Date. No mutation.

---

### TC-MGR-BLK-09 — Daily Recurrence: Field Swap
**Steps:** Change Recurrence → "Daily".  
**Expected:** Date field disappears. "End Date (optional)" appears. Times remain.

---

### TC-MGR-BLK-10 — Custom Recurrence: Day Chips
**Steps:** Recurrence = "Custom Days" → click Mon, Wed, Fri.  
**Expected:** 7 chips (Sun–Sat). Selected → primary (teal). `recurrence_days = [1, 3, 5]`.

---

### TC-MGR-BLK-11 — Room Dropdown Filtered by Clinic
**Steps:** Select Clinic A → observe Room options.  
**Expected:** Only Clinic A's rooms shown. Resets when clinic changes (`useEffect`).

---

### TC-MGR-BLK-12 — Room Disabled Without Clinic
**Steps:** Open form without selecting clinic.  
**Expected:** Room (optional) `disabled` (`aria-disabled="true"`).

---

### TC-MGR-BLK-13 — Delete Spacer Block: Confirm Dialog
**Steps:** Click trash icon on a spacer block card.  
**Expected:** ConfirmDialog: title "Delete Block", message "Delete this schedule block? This action cannot be undone.", [Cancel] [Delete (red)].

---

### TC-MGR-BLK-14 — Delete: Confirm
**Steps:** Confirm deletion.  
**Expected:** `deleteSpacerBlock` fires. "Block deleted." shown. Card removed.

---

### TC-MGR-BLK-15 — Delete: Cancel
**Steps:** Click delete → Cancel.  
**Expected:** Dialog closes. No mutation. Card remains.

---

### TC-MGR-BLK-16 — Room Blocks: Empty State
**Steps:** Room Blocks tab with no records.  
**Expected:** "No room blocks yet" centered in Card.

---

### TC-MGR-BLK-17 — Room Block Form: Room Required
**Steps:** (1) No clinic → check Room. (2) Select clinic + leave Room = "Select a room" → Create.  
**Expected:** Room disabled without clinic. `required` prevents submit with empty room.

---

### TC-MGR-BLK-18 — Create Room Block: Single (Happy Path)
**Steps:** Clinic + Room + Single + Date + Times + Reason → Create.  
**Expected:** `createRoomBlock` fires: `room_id`, `clinic_id`, `block_date`, times. "Room block created.".

---

### TC-MGR-BLK-19 — Room Block: Room Resets on Clinic Change
**Steps:** Select Clinic A + Room A-1 → change to Clinic B.  
**Expected:** `room_id` resets to `""`. Clinic B's rooms shown.

---

### TC-MGR-BLK-20 — Delete Room Block
**Steps:** Click trash icon on room block card.  
**Expected:** `handleDelete('room', id)` → `deleteRoomBlock` on confirm. "Block deleted.".

---

### TC-MGR-BLK-21 — Error Handling: Create Failure
**Steps:** Backend offline → Create.  
**Expected:** Red `<Alert>` with network error message. Form stays open.

---

### TC-MGR-BLK-22 — Success Alert Auto-Dismiss
**Steps:** Create a block successfully → wait 3+ seconds.  
**Expected:** Success message disappears (`setTimeout 3000ms`).

---

### TC-MGR-BLK-23 — Time Validation: End ≤ Start Blocked
**Steps:** Start = 10:30, End = 10:00 → Create.  
**Expected:** Red alert: "End time must be after start time." Form stays open. No mutation.

---

### TC-MGR-BLK-24 — Time Validation: Equal Times Blocked
**Steps:** Start = 10:00, End = 10:00 → Create.  
**Expected:** Same guard: `start >= end` → error shown.

---

### TC-MGR-BLK-25 — Time Validation in Room Block Form
**Steps:** Room block form: Start = 09:30, End = 08:00 → Create.  
**Expected:** `handleRoomBlockSubmit` also calls `validateTimes`. Red alert shown.

---

### TC-MGR-BLK-26 — Reason Field: maxLength 500 + Counter
**Steps:** Open form. Observe and type in Reason field.  
**Expected:** Counter "0 / 500" visible. Updates in real-time. Input stops at 500 chars.

---

### TC-MGR-BLK-27 — Tab Switch Closes Open Form
**Steps:** Open "Add Spacer Block" form → click "Room Blocks" tab.  
**Expected:** Form closes automatically. Room Blocks tab shows clean state.

---

### TC-MGR-BLK-28 — Room Block Cards: Data Display
**Steps:** View 3 mock room block cards.  
**Expected:**
- Card 1: Room 1A · City Heart Clinic · 8:00 AM – 12:00 PM · "Deep cleaning" · "single" chip.
- Card 2: Room Suite A · Central Medical Centre · 7:00 AM – 8:00 AM · "Maintenance" · "weekly".
- Card 3: Room 3C · Family Health Hub · 1:00 PM – 2:00 PM · no reason · "daily".

---

### TC-MGR-BLK-29 — aria-labels on Delete Buttons
**Steps:** Inspect delete icon buttons.  
**Expected:**
- Spacer: `aria-label="Delete spacer block for Dr. <first> <last>"`.
- Room: `aria-label="Delete room block for Room <number> at <clinic>"`.
- Tooltip: "Delete block".

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | All clinicians inactive | Clinician dropdown empty |
| E2 | No active rooms | Room dropdowns empty |
| E3 | Custom: no days selected | `recurrence_days: []` — backend validates (**SUG-BLK-011 pending**) |
| E4 | Start = End time | **FIXED** — `validateTimes` blocks, shows error |
| E5 | End before Start | **FIXED** — same guard |
| E6 | End Date in the past | No frontend guard — backend validates (**SUG-BLK-010 pending**) |
| E7 | Reason > 500 chars | **FIXED** — `maxLength={500}` prevents excess |
| E8 | Network failure during delete | `catch` → red alert |
| E9 | Rapid Add toggle | `p => !p` function update — race-condition-safe |
| E10 | 500 blocks loaded | List renders all; vertical scroll |
| E11 | Block with no reason | Reason line absent from card |
| E12 | Null clinic on block | `b.clinic?.name` optional chaining — no crash |
| E13 | Tab switch with form open | **FIXED** — `handleTabChange` closes + resets all forms |
