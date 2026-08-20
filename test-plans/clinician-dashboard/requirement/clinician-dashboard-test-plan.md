---
id: TP009
type: test-plan
feature: clinician-dashboard
created: 2026-03-19
updated: 2026-04-02
status: done
parent: unknown
related: [TR008, TS008]
---

# Clinician Dashboard — Test Plan

**Route:** `/clinician/dashboard`  
**File:** `frontend/src/pages/clinician/Dashboard.jsx`  
**Status:** ✅ Updated — 2026-03-30 (Session 5 QA) · **Total: 34 TCs, 10 Edge Cases**

---

## Feature Overview

Clinician-facing dashboard with:
- Gradient banner with dynamic clinician name (from `useAuth()`), today's date, type chip, clinic name, "Add Block" button (opens block creation drawer)
- Offline alert banner when backend unavailable
- 4 KPI cards (Total Today, Completed, Remaining, Video Calls) — with mock fallback values
- Scrollable timeline (08:00–18:00, 720px) with:
  - Appointment blocks (color-coded by status; overlap side-by-side)
  - Lunch break blocks (amber dashed)
  - Spacer/blocked blocks (grey dashed, tooltip with reason)
  - Current time red line
  - Auto-scrolls to current time on mount
  - Click → Appointment Detail Drawer
- "Upcoming Next" panel: next patient with Gravatar, time, "View Notes" (navigates) + "Start Session" (video only)
- "Upcoming Queue" panel: up to 4 next patients
- Auto-refresh every 60s with "Updated N min ago" timestamp
- Full mock data layer: MOCK_APPOINTMENTS, MOCK_LUNCH, MOCK_SPACERS (active when error && !data)

---

## Test Cases

### TC-CLDASH-01 — Auth Guard: No User
**Steps:** View page without authenticated clinician.  
**Expected:** Warning alert "Please log in to view your dashboard."

---

### TC-CLDASH-02 — Header Banner: Date and Doctor Name
**Steps:** Load page as Dr. Sarah Mitchell.  
**Expected:**
- Gradient banner (#006D77 → #0A9396)
- `dayjs().format('dddd, DD MMMM YYYY')` — today's date
- `displayName` = "Dr. Sarah Mitchell" (from `user?.clinician?.full_name`)
- Clinician type chip + clinic name
- "Updated 0 min ago" caption

---

### TC-CLDASH-02B — Header: "Add Block" Opens Drawer
**Steps:** Click "Add Block" in banner.  
**Expected:**
- Right-side drawer opens with "Add Time Block" form
- Start Time + End Time time pickers
- Optional Reason textarea
- Save Block button disabled until both times filled
- Cancel button closes drawer

---

### TC-CLDASH-03 — Header Banner: Fallback When No Backend
**Steps:** Backend offline; getClinician = null.  
**Expected:**
- displayName = `user?.clinician?.full_name || user?.name || 'Dr. —'`
- No "Dr. Doctor". Dynamic fallback.

---

### TC-CLDASH-04 — Offline Alert Banner
**Steps:** Backend offline.  
**Expected:** `<Alert severity="warning">⚠ Offline — showing demo data...</Alert>` shown below banner.

---

### TC-CLDASH-05 — KPI Cards: Live Data
**Steps:** Backend returns appointments.  
**Expected:** Dynamic values: `allAppointments.length`, `completedApps.length`, `upcomingApps.length`, `videoApps.length`.

---

### TC-CLDASH-06 — KPI Cards: Fallback Values
**Steps:** No backend data (before error); appointments empty.  
**Expected:** Values: 12, 5, 7, 3 (hardcoded `||` fallback).

---

### TC-CLDASH-07 — Timeline: 08:00–18:00 Hour Grid
**Steps:** View timeline.  
**Expected:**
- 720px scrollable area
- Hour labels 08:00–18:00 bold; half-hour lighter
- Auto-scroll to current time on mount (60px above current time)

---

### TC-CLDASH-07B — Timeline: Auto-Scroll to Current Time
**Steps:** Load page at e.g. 14:00.  
**Expected:** Timeline does not start at 08:00. `scrollTop = max(0, nowTop - 60)`.

---

### TC-CLDASH-08 — Timeline: Appointment Blocks
**Steps:** Backend or mock has appointments for today.  
**Expected:**
- Each block at `top = (h*60+m - 480) * 1.2`
- Height = `duration * 1.2`, min 28px
- Status colors: completed=#2DC653, cancelled=#E63946, scheduled=#006D77
- Patient name shown; product name if height > 30px
- Video appointments show Videocam icon

---

### TC-CLDASH-08B — Timeline Block Colours by Status
**Steps:** View MOCK_APPOINTMENTS with all 3 statuses.  
**Expected:** Emma Wilson = green, Kenji Yamada = red, others = teal.

---

### TC-CLDASH-08C — Product Name Visibility by Height
**Steps:** Compare 30-min vs 20-min block.  
**Expected:** 30-min: `height=36 > 30` → product shown. 20-min: `24 < 30` → product hidden.

---

### TC-CLDASH-09 — Timeline: Appointment Click Opens Detail Drawer
**Steps:** Click any appointment block.  
**Expected:**
- Right-side drawer with patient name, time, duration, product
- Status chip + type chip
- "View Notes" → navigates to `/patients/{id}/notes`
- "Join Video Call" button shown only for video type
- "Close" button dismisses drawer

---

### TC-CLDASH-09B — Appointment Drawer: View Notes Navigates
**Steps:** Click appointment → click "View Notes".  
**Expected:** Navigate to `/patients/{patient.id}/notes`.

---

### TC-CLDASH-09C — Appointment Drawer: Join Video Call
**Steps:** Click a video appointment → click "Join Video Call".  
**Expected:** Navigate to `/video-consultation/{id}`.

---

### TC-CLDASH-10 — Timeline: Lunch Break (Amber Dashed)
**Steps:** Mock/real lunch break data.  
**Expected:** Amber dashed block `#FFFBEB / #F59E0B`. RestaurantMenu icon. "Lunch Break" label.

---

### TC-CLDASH-11 — Timeline: Spacer Block (Grey Dashed)
**Steps:** Mock/real spacer block data.  
**Expected:** Grey dashed `#F8FAFC / #CBD5E1`. DoNotDisturb icon. "Blocked: reason". Tooltip shows reason.

---

### TC-CLDASH-12 — Upcoming Next Panel: Next Patient
**Steps:** One+ upcoming appointments.  
**Expected:** Patient name, formatted time, duration, type, Gravatar avatar (56px), "View Notes" + conditional "Start Session".

---

### TC-CLDASH-12B — Gravatar Avatar
**Steps:** nextAppt.patient.id = 'p2'.  
**Expected:** `https://www.gravatar.com/avatar/p2?d=mp`. Width=56, border.

---

### TC-CLDASH-12C — "Start Session" Video-Only
**Steps:** In-person nextAppt vs video nextAppt.  
**Expected:** In-person: only "View Notes". Video: "View Notes" + "Start Session".

---

### TC-CLDASH-13 — Upcoming Next: Empty State
**Steps:** No upcoming appointments.  
**Expected:** "No more appointments today." centered text.

---

### TC-CLDASH-14 — Queue: Shows Up to 4 Patients
**Steps:** Multiple upcoming appointments.  
**Expected:** nextAppt in Upcoming Next; max 4 in queue. Video icon shown for video type.

---

### TC-CLDASH-14B — Queue Capped at 4
**Steps:** 6+ upcoming appointments.  
**Expected:** Queue shows exactly 4; no 5th item.

---

### TC-CLDASH-15 — Queue: Empty State
**Steps:** 0–1 upcoming appointments.  
**Expected:** "Queue is empty."

---

### TC-CLDASH-16 — Auto-Refresh Every 60s
**Steps:** Wait 60 seconds.  
**Expected:** `refetch()` fires; `lastRefresh` updates; "Updated 1 min ago" increments.

---

### TC-CLDASH-16B — Refresh Interval Cleaned Up on Unmount
**Steps:** Navigate away and back.  
**Expected:** `clearInterval()` fires on unmount; no duplicate intervals.

---

### TC-CLDASH-17 — Timeline: Current Time Red Line
**Steps:** View between 08:00–18:00.  
**Expected:** Red 2px line at current time position. Red dot on left. `pointerEvents: none`.

---

### TC-CLDASH-18 — "Last Updated" Timestamp
**Steps:** Load page; wait > 1 min.  
**Expected:** "Updated 0 min ago" initially; increments after each 60s refresh.

---

### TC-CLDASH-19 — NaN Guard in getTopAndHeight
**Steps:** Pass invalid startTime format.  
**Expected:** Returns `{ top: 0, height: 36 }` — block positioned at top, min height.

---

### TC-CLDASH-20 — Overlap Detection
**Steps:** Two appointments at same time in MOCK_APPOINTMENTS.  
**Expected:** Side-by-side rendering via `assignOverlapColumns()`.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | `startTime` invalid format | `{ top: 0, height: 36 }` safe fallback |
| E2 | No duration, no endTime | Defaults to 30-min height |
| E3 | All appointments cancelled | upcomingApps=[], nextAppt=undefined, "No more appointments" |
| E4 | Timeline block past 18:00 | Scrollable area shows it; no overflow clip |
| E5 | Multiple appointments same time | Side-by-side via `assignOverlapColumns()` |
| E6 | patientId null in drawer | Guard prevents navigate crash |
| E7 | All mock appointments in the past | upcomingApps=[] → empty states |

---

## Summary

| TC Range | Count | Status |
|----------|-------|--------|
| TC-CLDASH-01 to TC-CLDASH-16 | 16 | ✅ Original (updated/clarified) |
| TC-CLDASH-17 to TC-CLDASH-20 | 4 | ✅ New — Session 2 (new features) |
| Sub-cases (02B, 04, 07B, 08B, 08C, 09B, 09C, 12B, 12C, 14B, 16B, 18, 19) | 13 | ✅ New — Session 2 |
| Edge Cases E1–E7 | 7 | ✅ 6 fixed, 1 documented |
| TC-CLDASH-21 to TC-CLDASH-27 | 7 | ✅ New — Session 4 (time format + queue) |
| Edge Cases E8–E10 | 3 | ✅ New — Session 4 |

---

## Session 4 — New Test Cases (2026-03-20)

### TC-CLDASH-21 — Timeline Time Labels in 12h Format
**Steps:** Load `/clinician/dashboard`. Observe left-column hour labels on the timeline.
**Expected:** Labels show `8:00 AM`, `9:00 AM`… `6:00 PM`. No 24h `HH:mm` strings.

---

### TC-CLDASH-22 — Appointment Card Top-Right Time in 12h Format
**Steps:** View any appointment block on the timeline.
**Expected:** Top-right corner shows `9:00 AM`. Not `09:00`.

---

### TC-CLDASH-23 — Appointment Tooltip Time in 12h Format
**Steps:** Hover over any appointment block.
**Expected:** Tooltip: `"Emma Wilson · 9:00 AM"`. Not `"Emma Wilson · 09:00"`.

---

### TC-CLDASH-24 — Appointment Detail Drawer Time in 12h Format
**Steps:** Click appointment block → drawer opens.
**Expected:** Body shows `"9:00 AM · 30 mins"`. Not `"09:00 · 30 mins"`.

---

### TC-CLDASH-25 — Queue List Time in 12h Format
**Steps:** Observe "Upcoming Queue" patient list.
**Expected:** Secondary text: `"10:00 AM · Video Consultation"`. Not `"10:00"`.

---

### TC-CLDASH-26 — Queue Item Click → Detail Drawer (SUG-012)
**Steps:** Click `EventNote` icon button beside any queue patient.
**Expected:** Appointment detail drawer opens with that patient's data.

---

### TC-CLDASH-27 — Add Block Snackbar in 12h Format (SUG-015)
**Steps:** Add Block with 10:00–11:00 AM → Save.
**Expected:** Snackbar: `"Block 10:00 AM–11:00 AM added to schedule."`

---

## Edge Cases — Session 4 Additions

| # | Edge Case | Expected |
|---|-----------|----------|
| E8 | Labels in PM hours | "2:30 PM" not "14:30" |
| E9 | Queue video item click | Drawer shows Join Call button; not shown for in-person |
| E10 | Multiple rapid queue clicks | Drawer always shows most-recently-clicked patient |

---

## Session 5 Test Cases (TC-CLDASH-32 to TC-CLDASH-34)

### TC-CLDASH-32 — "Now h:mm A" Chip on Current Time Line (SUG-CLDASH-014)
**Steps:** Load dashboard between 08:00–18:00. Observe the red current-time line.  
**Expected:** A small red pill chip reading "Now 2:35 PM" appears immediately to the right of the red dot. Chip is non-clickable (`pointerEvents: none`). Chip hidden when time is outside 08:00–18:00.

---

### TC-CLDASH-33 — Block Snackbar Uses 12h Format (SUG-CLDASH-015)
**Steps:** Click "Add Block" → enter Start: 10:00, End: 11:00 → Save.  
**Expected:** Snackbar reads: `"Block 10:00 AM–11:00 AM added to schedule."` No 24h `HH:mm` found.

---

### TC-CLDASH-34 — Delete Locally-Added Block from Timeline (SUG-CLDASH-016)
**Steps:**
1. Add a block via "Add Block" drawer. Observe grey spacer on timeline.  
   **Expected:** × button visible at right edge of the new block.
2. Click ×.  
   **Expected:** Block removed from timeline instantly. No page refresh needed.
3. Observe MOCK_SPACERS "Morning admin" block.  
   **Expected:** No × button shown (server-side blocks are not deletable from frontend).
