# Clinician Dashboard — Test Plan

**Route:** `/clinician/dashboard`
**File:** `frontend/src/pages/clinician/Dashboard.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Clinician-facing dashboard. Shows a gradient banner with date + doctor name, 4 KPI cards, a scrollable timeline (08:00–18:00) with appointments/lunch/spacer blocks, "Upcoming Next" panel, and patient queue list. Polls (refetch) every 60s. Mock fallbacks ensure page renders without backend.

---

## Test Cases

### TC-CLDASH-01 — Auth Guard: No User
**Steps:** View page without authenticated clinician user.
**Expected:**
- Warning alert "Please log in to view your dashboard."

---

### TC-CLDASH-02 — Header Banner: Today's Date and Doctor Name
**Steps:** Load page with authenticated clinician.
**Expected:**
- Gradient banner shows: today's date (e.g., "Monday, 16 March 2026"), "Dr. {clinician.name}" in h5.
- Clinician type chip + clinic name shown below.

---

### TC-CLDASH-03 — Header Banner: Fallback When No Backend
**Steps:** Backend returns no clinician data.
**Expected:**
- Falls back to `{ name: 'Doctor', clinicianType: 'Specialist', clinic: { name: 'Health Clinic' } }`.
- No crash.

---

### TC-CLDASH-04 — Header Banner: "Add Block" Button
**Steps:** Click "Add Block".
**Expected:**
- **BUG:** No `onClick` handler. Nothing happens. Enhancement needed (should open block creation).

---

### TC-CLDASH-05 — KPI Cards: Live Data
**Steps:** Backend returns appointments for today.
**Expected:**
- Total Today = `allAppointments.length`.
- Completed = appointments with `status='completed'`.
- Remaining = upcoming (scheduled after current time).
- Video Calls = appointments with `type='video'`.

---

### TC-CLDASH-06 — KPI Cards: Fallback Values
**Steps:** No backend data.
**Expected:**
- Cards show fallback values: 12, 5, 7, 3 respectively.

---

### TC-CLDASH-07 — Timeline: Renders 08:00 to 18:00
**Steps:** View the timeline scroll area.
**Expected:**
- Hour lines from 08:00 to 18:00.
- Hour labels on bold lines; 30-min lighter lines.
- Timeline is 720px tall (scrollable).

---

### TC-CLDASH-08 — Timeline: Appointment Blocks
**Steps:** Appointments exist for today.
**Expected:**
- Each appointment rendered as coloured block at correct `top` and `height` (1.2px per minute).
- Scheduled → teal `#006D77`; Completed → green `#2DC653`; Cancelled → red `#E63946`.
- Shows patient name + product name (if height > 30px).
- Video appointments show `VideocamIcon`.

---

### TC-CLDASH-09 — Timeline: Appointment Block Click
**Steps:** Click an appointment block.
**Expected:**
- `console.log('Selected Appt', appt.id)` fires.
- **BUG:** No UI interaction (e.g., drawer or detail panel). Enhancement needed.

---

### TC-CLDASH-10 — Timeline: Lunch Breaks
**Steps:** Lunch breaks returned from backend.
**Expected:**
- Amber dashed blocks rendered with 🍽️ icon and "Lunch Break" label.

---

### TC-CLDASH-11 — Timeline: Spacer Blocks
**Steps:** Spacer blocks returned.
**Expected:**
- Grey dashed blocks shown with `DoNotDisturbIcon`.
- Tooltip shows `sb.reason` or "Blocked time".

---

### TC-CLDASH-12 — Upcoming Next Panel: Next Patient
**Steps:** There is at least one upcoming appointment after now.
**Expected:**
- Next patient name, time, duration, type displayed.
- Gravatar avatar shown.
- "View Notes" button (outlined).
- "Start Session" button shown only for video appointments → navigates to `/video-consultation/:id`.

---

### TC-CLDASH-13 — Upcoming Next Panel: No More Appointments
**Steps:** No upcoming appointments remain.
**Expected:**
- "No more appointments today." message in panel.

---

### TC-CLDASH-14 — Patient Queue: Shows Up to 4 Patients
**Steps:** 6 upcoming appointments.
**Expected:**
- `nextAppt` shown in "Upcoming Next" panel.
- `queue` = next 4 appointments (excluding the `nextAppt`).
- Queue list shows name, time, product, video icon if applicable.

---

### TC-CLDASH-15 — Patient Queue: Empty State
**Steps:** Only 1 or 0 upcoming appointments.
**Expected:**
- "Queue is empty." shown in queue panel.

---

### TC-CLDASH-16 — Auto-Refresh Every 60s
**Steps:** Wait 60 seconds on the page.
**Expected:**
- `refetch()` called automatically via `setInterval`.
- Timeline updates with any new appointments.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | `startTime` in incorrect format (not HH:mm) | `getTopAndHeight` returns NaN for top/height; block not positioned correctly |
| E2 | Appointment with no `duration` and no `endTime` | Defaults to 30 min block height |
| E3 | All appointments have `status='cancelled'` | Remaining KPI = 0; queue empty |
| E4 | Timeline block exceeds 18:00 | Block overflows the 720px container; scrollable area accommodates it |
| E5 | Multiple appointments at same time | Blocks overlap (no conflict resolution implemented) |
