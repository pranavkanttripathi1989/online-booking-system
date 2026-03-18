# Staff Dashboard — Test Plan

**Route:** `/staff/dashboard`
**File:** `frontend/src/pages/staff/Dashboard.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Staff-facing dashboard. Shows 4 KPI cards, a "Today's Patient Queue" panel with check-in controls, a Recent Activity feed, and a Clinic Capacity section with room utilisation progress bars. All data is hardcoded/mock.

---

## Test Cases

### TC-STFDS-01 — Page Load
**Steps:** Navigate to `/staff/dashboard`. **Expected:** Title "Staff Dashboard"; subtitle "City Heart Clinic · Good morning!"; "View All Appointments" CTA button visible.

### TC-STFDS-02 — KPI Cards: Data
**Steps:** View 4 KPI cards. **Expected:** Today's Appointments=12, Checked In=3, Cancellations Today=1, New Registrations=4. Each has a colour-coded border and icon.

### TC-STFDS-03 — Header: View All Appointments Button
**Steps:** Click "View All Appointments". **Expected:** Navigates to `/staff/appointments`.

### TC-STFDS-04 — Patient Queue: Shows 3 Patients
**Steps:** View "Today's Patient Queue". **Expected:** Emma Wilson (10:00, Room 3A, checked-in), Omar Hassan (11:00, Room 3A, scheduled), Lily Chen (14:00, Room 2B, scheduled).

### TC-STFDS-05 — Patient Queue: Status Chips
**Steps:** View chip colours. **Expected:** checked-in → green (#D1FAE5/#065F46); scheduled → teal (#E8F8F9/#006D77).

### TC-STFDS-06 — Patient Queue: Check In Button
**Steps:** View scheduled patients. **Expected:** "Check In" button shown for scheduled patients; not shown for checked-in patients.

### TC-STFDS-07 — Patient Queue: Check In Action
**Steps:** Click "Check In" on Omar Hassan. **Expected:** **BUG:** No onClick handler; nothing happens. Enhancement needed.

### TC-STFDS-08 — Patient Queue: "Manage All" Button
**Steps:** Click "Manage All Appointments" below queue. **Expected:** Navigates to `/staff/appointments`.

### TC-STFDS-09 — Recent Activity: Feed
**Steps:** View activity feed. **Expected:** 4 recent activity items listed (check-in, cancel, registration, confirmation) with icons, text, and relative timestamps.

### TC-STFDS-10 — Recent Activity: Icon Colours
**Steps:** View icon colours. **Expected:** CheckCircle=green (#2DC653); Cancel=red (#E63946); Person=blue (#3A86FF).

### TC-STFDS-11 — Clinic Capacity: Progress Bars
**Steps:** View clinic capacity section. **Expected:** Room 1A: 8/10 (80%), Room 2B: 5/8 (62.5%), Room 3C: 3/6 (50%). Labels show "N/M slots".

### TC-STFDS-12 — Clinic Capacity: High Utilisation Colour
**Steps:** View Room 1A (80%). **Expected:** Progress bar colour = `#006D77` (teal, since 0.80 < 0.85 threshold). **Note:** threshold is >0.85; 0.80 is still teal.

### TC-STFDS-13 — Clinic Capacity: Over 85% → Red
**Steps:** Mock a room at 9/10 (90%). **Expected:** Progress bar colour = `#E63946` (red). Currently no room exceeds 85% in mock.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Check In button clicked | No handler; no state change |
| E2 | Resize to mobile | Cards collapse to 2 per row (xs=6); `md=3` for wider |
| E3 | Activity feed timestamp "2h ago" | No dayjs — pure static strings; no dynamic time |
