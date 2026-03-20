# Clinician Calendar — Test Plan

**Route:** `/clinician/calendar`  
**File:** `frontend/src/pages/clinician/Calendar.jsx`  
**Status:** ✅ Updated — 2026-03-19 (Session 2 QA)

---

## Feature Overview

Weekly calendar grid (Mon–Sun, 09:00–17:00) with week-aware mock appointment/break/block events. Dynamic week navigation using dayjs — header dates change per offset. Week label shows "This Week / Next Week / Last Week / N Weeks Ago / Week +N". Clicking an event shows a "Appointment Details" panel with time, type chip, "View Patient" (navigates to `/patients/{id}`) and "Join Call" (video only, navigates to `/video/{id}`). Current-time red line in today's column. Overlap detection: same-time events rendered side-by-side. Responsive with horizontal scroll for narrow viewports.

---

## Test Cases

### TC-CLCAL-00 — Navigation to Calendar from Sidebar
**Steps:** From any clinician page, click "Calendar" in sidebar.  
**Expected:** Navigate to `/clinician/calendar`. Page load confirmed.

---

### TC-CLCAL-01 — Page Load: Header, Grid, Legend
**Steps:** Navigate to `/clinician/calendar`.  
**Expected:**
- h2 "Calendar"
- Subtitle shows logged-in clinician name + org (dynamic, not hardcoded)
- 7-day grid with hour rows 09:00–17:00
- Legend: In-Person (teal), Video (purple), Break (amber), Blocked (grey)
- Week range displayed right-aligned: e.g. "17 Mar – 23 Mar 2026"

---

### TC-CLCAL-01B — Subtitle Matches Logged-In User
**Steps:** Log in as Dr. Sarah Mitchell; observe subtitle.  
**Expected:** "Dr. Sarah Mitchell · [org name]" — NOT "Dr. James Wilson".

---

### TC-CLCAL-02 — Week Navigation: Next Week
**Steps:** Click `>`.  
**Expected:**
- Chip label → "Next Week"
- Day header dates advance by 7
- Different events visible (next-week events only)

---

### TC-CLCAL-02B — Week Navigation: Week +N Labels
**Steps:** Click `>` multiple times.  
**Expected:** Labels "Week +2", "Week +3" etc.

---

### TC-CLCAL-02C — Dates Update on Navigation
**Steps:** Click `>` once; verify day header dates.  
**Expected:** Dates advance exactly 7 days from current-week Monday (not hardcoded).

---

### TC-CLCAL-03 — Week Navigation: Previous Week
**Steps:** Click `<` once from "This Week".  
**Expected:** Label → "Last Week"; dates go back 7; previous-week events shown.

---

### TC-CLCAL-03B — Saturday and Sunday Empty Columns
**Steps:** View Sat/Sun columns.  
**Expected:** No event blocks. "No appts" caption visible.

---

### TC-CLCAL-04 — Today Button Resets weekOffset
**Steps:** Navigate away; click "Today".  
**Expected:** Chip → "This Week"; dates return to current week.

---

### TC-CLCAL-04B — Chip Click Resets weekOffset
**Steps:** Click chip label.  
**Expected:** Returns to "This Week".

---

### TC-CLCAL-04C — Negative Offset "N Weeks Ago" Label
**Steps:** Click `<` three times (weekOffset = -3).  
**Expected:** Label = "3 Weeks Ago".

---

### TC-CLCAL-05 — Legend Display
**Steps:** View below header.  
**Expected:** 4 legend items; week range shown right-aligned.

---

### TC-CLCAL-06 — Time Column
**Steps:** View leftmost column.  
**Expected:** 56px wide; 9 labels 09:00–17:00; each 60px.

---

### TC-CLCAL-07 — Day Headers: Dynamic Dates + Today Highlight
**Steps:** View column headers.  
**Expected:** Dates from dayjs (not hardcoded). Today's column: circular teal badge around date number.

---

### TC-CLCAL-08 — Event Blocks: Positioning Formula
**Steps:** Verify event positions.  
**Expected:**
- `topPx = (start - 9) * 60`
- `heightPx = (end - start) * 60 - 2`
- 09:00 event → top=0; 10:00 → top=60; 12:00 → top=180

---

### TC-CLCAL-08B — Event at Grid Bottom (17:00)
**Steps:** Hypothetically add/verify event at 17:00.  
**Expected:** `topPx=480` inside 540px container; no overflow; `overflow: 'hidden'` on grid.

---

### TC-CLCAL-09 — Event Blocks: Colour by Type
**Steps:** View colored blocks.  
**Expected:** In-person=#006D77, Video=#7C3AED, Break=#D97706, Block=#6B7280.

---

### TC-CLCAL-10 — Event Tooltip on Hover
**Steps:** Hover over event.  
**Expected:** Tooltip = `"{patient} · {type} · {HH:MM}–{HH:MM}"` (time range included).

---

### TC-CLCAL-11 — Short Events: Emoji Shown
**Steps:** View 30-min events.  
**Expected:** `heightPx=28 > 22` → emoji visible below name; in-person=🏥, video=📹, break=☕.

---

### TC-CLCAL-11B — Block Type Emoji
**Steps:** Verify block event emoji.  
**Expected:** `type='block'` → falls through to default `🏥` emoji.

---

### TC-CLCAL-12 — Click In-Person Event: Detail Card
**Steps:** Click an in-person event.  
**Expected:** "Appointment Details" card with teal border; Avatar: 2-letter initials; name; time shown; in-person chip (LocationOnIcon); "View Patient" button (with navigation); no "Join Call".

---

### TC-CLCAL-12B — Click Same Event Twice
**Steps:** Click same event twice.  
**Expected:** Card stays open; no toggle behavior.

---

### TC-CLCAL-13 — Click Break Event: No Detail Card
**Steps:** Click LUNCH block.  
**Expected:** No "Appointment Details" card. `selected.type !== 'break'` guard.

---

### TC-CLCAL-13B — Click Block Event: No Detail Card
**Steps:** Click Team Meeting block.  
**Expected:** No card. `selected.type !== 'block'` guard.

---

### TC-CLCAL-14B — View Patient Button Navigates
**Steps:** Click event → detail card. Click "View Patient".  
**Expected:** Navigate to `/patients/{patientId}`. (Guard: null patientId = no-op.)

---

### TC-CLCAL-14C — Avatar Initials Derivation
**Steps:** Click various events; observe avatar.  
**Expected:** Emma Wilson → "EW"; Lily Chen → "LC"; Sophie M. → "SM".

---

### TC-CLCAL-15 — Video Event: "Join Call" Button
**Steps:** Click Lily Chen (video, Tue).  
**Expected:** "Join Call" button (VideocamIcon, contained); "View Patient" also present.

---

### TC-CLCAL-15B — Join Call Navigation
**Steps:** Click "Join Call" on video event.  
**Expected:** Navigate to `/video/{id}`.

---

### TC-CLCAL-16 — Detail Card Close Button
**Steps:** Click "Close" in open detail card.  
**Expected:** `selected = null`; card unmounts.

---

### TC-CLCAL-17 — Event Block: Hover Effect
**Steps:** Hover over any event.  
**Expected:** `opacity: 0.9 → 1`; `boxShadow: '0 2px 8px rgba(0,0,0,0.2)'`; `transition: 'opacity 0.15s'`.

---

### TC-CLCAL-18 — Overlap Detection: Side-by-Side Layout
**Steps:** View Mon column (Omar Hassan 10:00–10:30 + Anna Ko 10:06–10:36).  
**Expected:** Events rendered side-by-side (not stacked). Each occupies ~50% width of column.

---

### TC-CLCAL-19 — Current Time Red Line
**Steps:** Visit during 09:00–17:00; observe today's column.  
**Expected:** Red horizontal line at current time position. Red dot on left end. Updates every 60s.

---

### TC-CLCAL-20 — Responsive Horizontal Scroll
**Steps:** Narrow browser window below 700px.  
**Expected:** Horizontal scrollbar visible; calendar not collapsed; min-width 700px enforced.

---

### TC-CLCAL-21 — Mock Data Layer: Different Events per Week
**Steps:** Navigate forward (Next Week) and back (Last Week).  
**Expected:** Different event sets per week (week-aware `MOCK_EVENTS`).

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Event at 17:00 (grid bottom) | `topPx=480` inside 540px; no overflow |
| E2 | `weekOffset=-1` | "Last Week" label (not "Week +-1") |
| E3 | Empty events array (far future week) | Grid renders without crash; "No appts" in Sat/Sun |
| E4 | Long patient name | `noWrap` clips text with ellipsis |
| E5 | Multiple overlapping events | Side-by-side via `assignOverlapColumns()` |
| E6 | `patientId=null` for break/block | Guard prevents navigation |
| E7 | Current time outside 09:00–17:00 | Red line hidden via `currentTimePx >= 0 && <= grid height` |

---

## Summary

| TC Range | Count | Status |
|----------|-------|--------|
| TC-CLCAL-00 to TC-CLCAL-17 | 18 | ✅ Original (updated/improved) |
| TC-CLCAL-18 to TC-CLCAL-21 | 4 | ✅ New — Session 2 |
| Additional new cases (01B, 02C, 03B, 04C, 11B, 12B, 14B, 14C, 15B) | 9 | ✅ New — Session 2 |
| Edge cases (E1–E7) | 7 | ✅ 6 resolved, 1 documented (E4 noWrap) |
