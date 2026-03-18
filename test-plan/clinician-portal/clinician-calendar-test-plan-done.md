# Clinician Calendar — Test Plan

**Route:** `/clinician/calendar`
**File:** `frontend/src/pages/clinician/Calendar.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

A weekly calendar grid (Mon–Sun, 09:00–17:00) with mock appointment/break/block events. Week offset navigation (previous/next/today). Clicking an event block sets a selected state and shows a detail card below. No backend integration — all data is static `EVENTS` mock array.

---

## Test Cases

### TC-CLCAL-01 — Page Load
**Steps:** Navigate to `/clinician/calendar`.
**Expected:**
- Title "Calendar", subtitle "Dr. James Wilson · City Heart Clinic".
- Weekly grid with 7 day columns (Mon–Sun).
- Hour rows from 09:00 to 17:00 (9 hours × 60px = 540px).

---

### TC-CLCAL-02 — Week Navigation: Next Week
**Steps:** Click the ">" (next) icon.
**Expected:**
- `weekOffset` increments by 1.
- Week label chip changes to "Next Week" (offset=1) or "Week +{N}".

---

### TC-CLCAL-03 — Week Navigation: Previous Week
**Steps:** Click the "<" (previous) icon.
**Expected:**
- `weekOffset` decrements by 1.
- Label changes accordingly (negative offset = "Week -1" implicitly — no label for negative, just "Week {offset}).

---

### TC-CLCAL-04 — Week Navigation: Today Button / Chip Click
**Steps:** Navigate to next week; click "Today" button or week label chip.
**Expected:**
- `weekOffset` resets to 0.
- Label returns to "This Week".

---

### TC-CLCAL-05 — Legend Display
**Steps:** View below the header.
**Expected:**
- 4 legend items: In-Person (#006D77), Video (#7C3AED), Break (#D97706), Blocked (#6B7280).
- Each shows coloured 12×12 square.

---

### TC-CLCAL-06 — Time Column
**Steps:** View leftmost column.
**Expected:**
- 56px wide; 9 time labels: 09:00 through 17:00.
- Each occupies a 60px row.

---

### TC-CLCAL-07 — Day Headers
**Steps:** View column headers.
**Expected:**
- Each header: day abbreviation (Mon–Sun) + date number (20–26 hardcoded).
- Monday (dayIdx=0) has highlighted background `#E8F8F9` and teal date number.

---

### TC-CLCAL-08 — Event Blocks: Positioning
**Steps:** Verify events are correctly positioned.
**Expected:**
- Event starting at 9:00 → `top = (9-9) * 60 = 0px`.
- Event from 10:00–11:00 (duration 1h) → top = 60px, height = 58px.
- Event from 12:00–12:30 → top = 180px, height = 28px.

---

### TC-CLCAL-09 — Event Blocks: Colour by Type/Status
**Steps:** View different event blocks.
**Expected:**
- `color: '#006D77'` for in-person confirmed events.
- `color: '#7C3AED'` for video events.
- `color: '#D97706'` for break events.
- `color: '#6B7280'` for block events.

---

### TC-CLCAL-10 — Event Block: Patient Name Display
**Steps:** Hover over any event block.
**Expected:**
- Tooltip shows `"{patient} · {type}"`.
- Patient name shown inside block (white text, fontWeight 700, noWrap).

---

### TC-CLCAL-11 — Event Block: Short Events
**Steps:** View 30-min events (heightPx = 28).
**Expected:**
- Only patient name shown (no type emoji — `heightPx > 22` is just barely true).

---

### TC-CLCAL-12 — Event Block Click: Sets Selected
**Steps:** Click on any non-break, non-block event.
**Expected:**
- `selected` state set to that event.
- Detail card appears below calendar.

---

### TC-CLCAL-13 — Event Block: Break/Block Not Selectable for Detail
**Steps:** Click on a break (LUNCH) or block event.
**Expected:**
- Click triggers `setSelected(ev)` but detail card check `selected.type !== 'break' && selected.type !== 'block'` prevents card from showing.

---

### TC-CLCAL-14 — Detail Card: Patient Info Display
**Steps:** Click an in-person appointment event.
**Expected:**
- "Appointment Details" card appears.
- Patient name, type chip (LocationOnIcon + "in-person"), "View Patient" + Close buttons.

---

### TC-CLCAL-15 — Detail Card: Video Appointment Shows Join Call
**Steps:** Click a video event.
**Expected:**
- "Join Call" button shown (with VideocamIcon).
- Navigates to `/video/:id`.

---

### TC-CLCAL-16 — Detail Card Close Button
**Steps:** Click "Close" in detail card.
**Expected:**
- `selected` set to null; card disappears.

---

### TC-CLCAL-17 — Event Block: Hover Effect
**Steps:** Hover over an event block.
**Expected:**
- `opacity` increases from 0.9 → 1.
- `boxShadow` shown (`0 2px 8px rgba(0,0,0,0.2)`).
- CSS `transition: 'opacity 0.15s'`.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Event at exactly 17:00 (end of grid) | Block positioned at bottom edge; may overflow |
| E2 | `weekOffset` = -1 | Label would show "Week +-1" — no explict negative handling |
| E3 | Events array empty | Calendar renders with no blocks; no crash |
| E4 | Very long patient name in event | `noWrap` clips text in block |
| E5 | Multiple events at same time in same column | Blocks overlap (same left/right absolute positioning) |
