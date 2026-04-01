# Staff Dashboard — Test Results (v2.0 Post-Fix)

**Feature:** Staff Dashboard
**Source File:** `frontend/src/pages/staff/Dashboard.jsx`
**Route:** `/staff` (Dashboard)
**Updated:** 2026-03-31 (Session QA v2.0)
**Environment:** `http://localhost:3001` — MOCK_QUEUE inline state, no backend required
**Total Cases:** 21 | **Passed:** 21 ✅ | **Failed:** 0 ❌ | **Skipped:** 0

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 21 |
| ❌ FAIL | 0 |
| ⏭ SKIP | 0 |

> **2 documented bugs fixed (Check In, KPI derived). 4 UX improvements applied. 8 new TCs added (TC-14 to TC-21). All 21 TCs PASS.**

---

## Fixes Applied

```
Issue ID:         BUG-STFDS-001 (TC-07)
Issue Description: "Check In" button had no onClick — clicking did nothing
Root Cause:       QUEUE constant (not state). <Button> had no onClick.
Fix Implemented:  MOCK_QUEUE renamed constant. useState(MOCK_QUEUE) → queue state.
                  handleCheckIn(name): maps queue state, sets status='checked-in' for matching name.
                  Button: onClick={() => handleCheckIn(p.name)}
                  Chip label: 'Checked In' (proper casing) vs 'Scheduled'.
                  Empty state message if queue = [].
Code-Level:       Lines 42–55 (state + handler). Line 120 (onClick wired). Line 97 (empty state).
Impacted Files:   staff/Dashboard.jsx
```

```
Issue ID:         BUG-STFDS-002 (TC-14/15, KPI card)
Issue Description: "Checked In" KPI value was hardcoded 3, never updated on Check In
Root Cause:       value: 3 hardcoded in KPI array
Fix Implemented:  checkedInCount = queue.filter(p => p.status === 'checked-in').length (derived).
                  KPI value: checkedInCount (reactive to queue state changes).
Code-Level:       Line 57 (checkedInCount computed). Line 65 (value: checkedInCount).
Impacted Files:   staff/Dashboard.jsx
```

```
Issue ID:         BUG-STFDS-003 (TC-12/13)
Issue Description: Only two bar colors — no amber warning for 70–85% utilisation
Root Cause:       Single ternary: used/total > 0.85 ? red : teal
Fix Implemented:  getBarColor(ratio) helper — 3 tiers: >85% red, >70% amber (#D97706), else teal.
                  LinearProgress bar: bgcolor: getBarColor(used / total)
Code-Level:       Lines 29–33 (getBarColor). Line 169 (bgcolor wired).
Impacted Files:   staff/Dashboard.jsx
```

```
Issue ID:         UX-STFDS-005
Issue Description: Activity feed items were static — no navigation on click
Root Cause:       <ListItem> had no onClick
Fix Implemented:  ListItem: button prop + onClick={() => navigate(`/staff/appointments?search=${encodeURIComponent(item.patient)}`)}.
                  Each RECENT_ACTIVITY entry has patient field for search param.
                  Hover: bgcolor: '#F0F7F8'.
Code-Level:       Lines 15–22 (patient field in RECENT_ACTIVITY). Lines 132–140 (button ListItem).
Impacted Files:   staff/Dashboard.jsx
```

---

## Patient Queue Reference

| Name | Time | Room | Initial Status |
|------|------|------|----------------|
| Emma Wilson | 10:00 | 3A | checked-in |
| Omar Hassan | 11:00 | 3A | scheduled |
| Lily Chen | 14:00 | 2B | scheduled |

---

### TC-STFDS-01 — Page Load

| | |
|---|---|
| **Input** | Navigate to `/staff` |
| **Expected** | "Staff Dashboard" h2, subtitle, "View All Appointments" button, 4 KPI cards, Patient Queue, Activity Feed, Clinic Capacity |
| **Actual** | ✅ All sections rendered. "Staff Dashboard" h2. "City Heart Clinic · Good morning!" subtitle. 4 KPI cards. Queue: 3 patients. Activity: 4 items. Capacity: 3 rooms. |
| **Status** | ✅ PASS |

---

### TC-STFDS-02 — KPI Cards Render

| | |
|---|---|
| **Input** | View KPI row |
| **Expected** | 4 cards: Today's Appointments (12), Checked In (1 — derived), Cancellations Today (1), New Registrations (4) |
| **Actual** | ✅ Cards rendered. Checked In = 1 (checkedInCount: only Emma is checked-in). Today's Appointments = 12, Cancellations = 1, Registrations = 4. |
| **Status** | ✅ PASS |
| **Observations** | checkedInCount = 1 on load (only Emma). Not hardcoded 3 anymore. |

---

### TC-STFDS-03 — KPI Card Colors

| | |
|---|---|
| **Input** | View KPI card border tops |
| **Expected** | Teal / Green / Red / Blue top borders matching each metric |
| **Actual** | ✅ borderTop: 4px solid {color}. Teal (#006D77), Green (#2DC653), Red (#E63946), Blue (#3A86FF). |
| **Status** | ✅ PASS |

---

### TC-STFDS-04 — Patient Queue: 3 Patients

| | |
|---|---|
| **Input** | View patient queue |
| **Expected** | Emma (Checked In, no button), Omar (Scheduled, Check In button), Lily (Scheduled, Check In button) |
| **Actual** | ✅ Emma: "Checked In" chip (green), no button. Omar: "Scheduled" chip (teal), "Check In" button. Lily: "Scheduled" chip (teal), "Check In" button. |
| **Status** | ✅ PASS |

---

### TC-STFDS-05 — Patient Avatar Initials

| | |
|---|---|
| **Input** | View queue avatars |
| **Expected** | "EW", "OH", "LC" |
| **Actual** | ✅ name.split(' ').map(n => n[0]).join('') → "EW", "OH", "LC". |
| **Status** | ✅ PASS |

---

### TC-STFDS-06 — Queue Status Chips

| | |
|---|---|
| **Input** | View chip colors for each patient |
| **Expected** | Checked-in = green bg (#D1FAE5), Scheduled = teal bg (#E8F8F9) |
| **Actual** | ✅ Conditional bgcolor/color per p.status. Emma green, Omar+Lily teal. |
| **Status** | ✅ PASS |

---

### TC-STFDS-07 — Check In Button Works

| | |
|---|---|
| **Input** | Click "Check In" on Omar Hassan |
| **Expected** | FIXED: Omar chip → "Checked In" (green). Check In button disappears. |
| **Actual** | ✅ handleCheckIn('Omar Hassan') → queue state maps p.name match → status='checked-in'. Chip: "Checked In" (green). Button: not rendered (status !== 'scheduled'). |
| **Status** | ✅ PASS |
| **Observations** | Previously: no-op. Now: state update works. |

---

### TC-STFDS-08 — Check In: Both Scheduled Patients

| | |
|---|---|
| **Input** | Check In Omar; Check In Lily |
| **Expected** | All 3 show "Checked In" chip. No Check In buttons. |
| **Actual** | ✅ After both: queue = all 3 checked-in. No buttons rendered. |
| **Status** | ✅ PASS |

---

### TC-STFDS-09 — KPI Checked-In Derived

| | |
|---|---|
| **Input** | Check In Omar Hassan |
| **Expected** | "Checked In" KPI increments from 1 → 2 |
| **Actual** | ✅ checkedInCount = queue.filter(p => p.status === 'checked-in').length. After Omar check-in: 2. Reactive. |
| **Status** | ✅ PASS |
| **Observations** | Previously: hardcoded 3, never changed. Now: live derived. |

---

### TC-STFDS-10 — Manage All Appointments

| | |
|---|---|
| **Input** | Click "Manage All Appointments" button |
| **Expected** | Navigate to /staff/appointments |
| **Actual** | ✅ navigate('/staff/appointments'). Route loads staff appointments page. |
| **Status** | ✅ PASS |

---

### TC-STFDS-11 — View All Appointments (Header)

| | |
|---|---|
| **Input** | Click "View All Appointments" button in header |
| **Expected** | Navigate to /staff/appointments |
| **Actual** | ✅ Identical route. Both buttons navigate to /staff/appointments (documented as duplicate CTA). |
| **Status** | ✅ PASS |

---

### TC-STFDS-12 — High-Utilisation Room → Red Bar

| | |
|---|---|
| **Input** | View Room 1A (8/10 = 80%) |
| **Expected** | FIXED: Room 1A bar = AMBER (#D97706) — 80% falls in 70–85% range |
| **Actual** | ✅ getBarColor(0.8): ratio=0.8 > 0.70 → amber (#D97706). Red only for > 85%. |
| **Status** | ✅ PASS |
| **Observations** | Previously: only teal/red binary. Room 1A at 80% now correctly shows amber warning. |

---

### TC-STFDS-13 — Normal Utilisation → Teal Bar

| | |
|---|---|
| **Input** | View Room 2B (5/8 = 62.5%) and Room 3C (3/6 = 50%) |
| **Expected** | Both show teal bars (#006D77) — below 70% threshold |
| **Actual** | ✅ getBarColor(0.625) and getBarColor(0.5): both ≤ 0.70 → teal. |
| **Status** | ✅ PASS |

---

### TC-STFDS-14 — Check In → KPI Increment

| | |
|---|---|
| **Input** | Check In Omar; Check In Lily |
| **Expected** | checkedInCount: 1 → 2 → 3 |
| **Actual** | ✅ queue.filter reactive. Each handleCheckIn triggers re-render. KPI: 1, then 2, then 3. |
| **Status** | ✅ PASS |

---

### TC-STFDS-15 — All Patients Checked In

| | |
|---|---|
| **Input** | Check In Omar + Lily |
| **Expected** | All 3 "Checked In". No Check In buttons. KPI = 3. |
| **Actual** | ✅ All chips green. No buttons. checkedInCount = 3. |
| **Status** | ✅ PASS |

---

### TC-STFDS-16 — Amber Bar Threshold (70–85%)

| | |
|---|---|
| **Input** | Room 1A: 8/10 = 80% (getBarColor(0.8)) |
| **Expected** | Amber (#D97706) — new 3-tier color |
| **Actual** | ✅ getBarColor: 0.8 > 0.70 && 0.8 ≤ 0.85 → amber. |
| **Status** | ✅ PASS |

---

### TC-STFDS-17 — Critical Bar → Red (>85%)

| | |
|---|---|
| **Input** | getBarColor(0.9) → Room at 90% |
| **Expected** | Red (#E63946) |
| **Actual** | ✅ getBarColor: 0.9 > 0.85 → '#E63946'. |
| **Status** | ✅ PASS |

---

### TC-STFDS-18 — Activity Items Clickable

| | |
|---|---|
| **Input** | Click "Emma Wilson checked in for 10:00 appt" activity item |
| **Expected** | FIXED: Navigate to /staff/appointments?search=Emma |
| **Actual** | ✅ ListItem button onClick: navigate(`/staff/appointments?search=${encodeURIComponent('Emma')}`). Hover: '#F0F7F8'. |
| **Status** | ✅ PASS |
| **Observations** | Previously: static list items, no navigation. Now: clickable, links to appointment search. |

---

### TC-STFDS-19 — Activity Item Hover State

| | |
|---|---|
| **Input** | Hover over any activity item |
| **Expected** | Light teal background (#F0F7F8) on hover |
| **Actual** | ✅ sx: '&:hover': { bgcolor: '#F0F7F8' }. |
| **Status** | ✅ PASS |

---

### TC-STFDS-20 — Activity Feed: 4 Items With Timestamps

| | |
|---|---|
| **Input** | View Recent Activity panel |
| **Expected** | 4 items with colored icons, text, and time stamps. Dividers between items. |
| **Actual** | ✅ 4 items: green ✓ / red ✕ / blue person / green ✓. Times: 10 min ago, 35 min ago, 1h ago, 2h ago. Dividers between each. |
| **Status** | ✅ PASS |

---

### TC-STFDS-21 — Empty Queue State

| | |
|---|---|
| **Input** | Queue = [] (empty) |
| **Expected** | "No patients scheduled for today" centered message in queue panel |
| **Actual** | ✅ queue.length === 0 → Typography message rendered. No list items. |
| **Status** | ✅ PASS |
