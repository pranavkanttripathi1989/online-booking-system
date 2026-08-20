---
id: TP035
type: test-plan
feature: staff-dashboard
created: 2026-04-02
updated: 2026-04-02
status: approved
parent: unknown
related: [TR034, TS035]
---

# Staff Dashboard — Test Plan (v2.0)

**Module:** Staff Dashboard (`/staff`)
**Source:** `frontend/src/pages/staff/Dashboard.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## Feature Overview

Read-only staff dashboard with 4 KPI cards, today's patient queue (interactive Check In), recent activity feed (clickable), and clinic capacity bars (3-tier color). All data from MOCK_QUEUE inline state + RECENT_ACTIVITY constant. No backend required.

---

## 1. Page Load & Layout

### TC-STFDS-01 — Page load
**Steps:** Navigate to `/staff`.
**Expected:** "Staff Dashboard" h2. "City Heart Clinic · Good morning!" subtitle. "View All Appointments" button. 4 KPI cards (xs=6 md=3). Patient Queue + Activity Feed + Clinic Capacity.

### TC-STFDS-21 — Responsive layout
**Steps:** Resize browser to < 900px.
**Expected:** KPI cards collapse to 2 per row (xs=6). Queue + Activity stack vertically (xs=12 on mobile).

---

## 2. KPI Cards

### TC-STFDS-02 — KPI cards render
**Steps:** View KPI row on load.
**Expected:** Today's Appointments=12, Checked In=1 (derived), Cancellations=1, Registrations=4.

### TC-STFDS-03 — KPI card border colors
**Steps:** View card border tops.
**Expected:** Teal / Green / Red / Blue top borders per card.

### TC-STFDS-09 — Checked In KPI derives from queue state
**Steps:** Click "Check In" on Omar Hassan.
**Expected:** "Checked In" card increments from 1 → 2.

### TC-STFDS-14 — Sequential check-ins increment KPI
**Steps:** Check In Omar; Check In Lily.
**Expected:** KPI: 1 → 2 → 3.

---

## 3. Patient Queue

### TC-STFDS-04 — Queue: 3 patients rendered
**Steps:** View queue on load.
**Expected:** Emma (Checked In, no button), Omar (Scheduled + Check In), Lily (Scheduled + Check In).

### TC-STFDS-05 — Patient avatar initials
**Steps:** View avatars.
**Expected:** "EW", "OH", "LC" from name.split(' ').map(n => n[0]).join('').

### TC-STFDS-06 — Chip colors: checked-in vs scheduled
**Steps:** View chips.
**Expected:** checked-in = green bg (#D1FAE5), scheduled = teal bg (#E8F8F9).

### TC-STFDS-07 — Check In button fires handler
**Steps:** Click "Check In" on Omar Hassan.
**Expected:** Chip → "Checked In" (green). Button disappears. KPI increments.

### TC-STFDS-08 — Check In all scheduled patients
**Steps:** Click Check In for Omar + Lily.
**Expected:** All 3 chips green "Checked In". No Check In buttons remain.

### TC-STFDS-15 — All checked in state after 2 actions
**Steps:** Check In Omar + Lily.
**Expected:** checkedInCount = 3. All chips green. No buttons.

### TC-STFDS-20E — Empty queue state
**Steps:** queue = [] (mock empty scenario).
**Expected:** "No patients scheduled for today" centered in queue panel. No list items.

---

## 4. Activity Feed

### TC-STFDS-20 — 4 activity items with icons + timestamps
**Steps:** View Recent Activity panel.
**Expected:** 4 items. Icons: green ✓ (check-in), red ✕ (cancel), blue person (register), green ✓ (confirm). Times: 10 min ago, 35 min ago, 1h ago, 2h ago. Dividers between items.

### TC-STFDS-18 — Activity item navigates on click
**Steps:** Click "Emma Wilson checked in for 10:00 appt".
**Expected:** Navigate to /staff/appointments?search=Emma.

### TC-STFDS-19 — Activity item hover state
**Steps:** Hover any item.
**Expected:** Light teal background (#F0F7F8).

---

## 5. Navigation

### TC-STFDS-10 — "Manage All Appointments" button
**Steps:** Click queue panel footer button.
**Expected:** Navigate to /staff/appointments.

### TC-STFDS-11 — "View All Appointments" header button
**Steps:** Click header button.
**Expected:** Navigate to /staff/appointments.

---

## 6. Clinic Capacity

### TC-STFDS-12 — 80% capacity → amber bar
**Steps:** View Room 1A (8/10 = 80%).
**Expected:** Amber bar (#D97706) — 70–85% tier.

### TC-STFDS-13 — Normal capacity → teal bars
**Steps:** View Room 2B (62.5%) and Room 3C (50%).
**Expected:** Teal bars (#006D77) — below 70%.

### TC-STFDS-16 — Amber threshold boundary (70–85%)
**Steps:** getBarColor(0.8) = 80%.
**Expected:** Amber. getBarColor(0.7) = 70% exactly → teal (threshold: > 0.70, not >=).

### TC-STFDS-17 — Critical threshold → red (>85%)
**Steps:** getBarColor(0.9) = 90%.
**Expected:** Red (#E63946).

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | Check In Emma (already checked-in) | handleCheckIn maps — no change since that name matches checked-in already. Idempotent. |
| E2 | Resize to < 600px | KPI cards wrap to 2 per row. Queue cards stack. |
| E3 | Activity feed: click each item | Navigates to /staff/appointments?search={patient}. Each item navigable. |
| E4 | Room at exactly 70.1% | getBarColor(0.701) → amber (> 0.70 threshold). |
| E5 | Room at exactly 85.1% | getBarColor(0.851) → red (> 0.85 threshold). |
| E6 | Queue empty (0 patients) | Empty state "No patients scheduled for today" shown. No Paper cards. |
| E7 | All 3 patients checked-in from load | No Check In buttons rendered at all. checkedInCount = 3 from load. |
| E8 | KPI "Checked In" on fresh load | checkedInCount = 1 (Emma). Not hardcoded. |

---

## Total: 21 Test Cases + 8 Edge Cases
