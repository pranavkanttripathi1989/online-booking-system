# Staff Dashboard — Test Results

**Feature:** Staff — Dashboard  
**Test Plan:** [staff-dashboard-test-plan-done.md](../test-plan/staff/staff-dashboard-test-plan-done.md)  
**Source File:** `frontend/src/pages/staff/Dashboard.jsx` (163 lines)  
**Route:** `/staff/dashboard`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Live Browser + Source Review)  
**Environment:** `http://localhost:3001` as Admin User (Staff portal) — **Hardcoded mock data, no backend**  
**Total Cases:** 13 | **Edge Cases:** 3

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 12 |
| ❌ FAIL (Documented Bug) | 1 |
| ✅ Source-Verified | 1 (TC-13) |
| ⏭ SKIPPED | 0 |

> **12/13 test cases PASS.** 1 documented bug confirmed: "Check In" button has no `onClick` handler — no state change on click.  
> All hardcoded data renders correctly. Both navigation buttons route to `/staff/appointments`.

---

## Screenshots

![Staff Dashboard — Full Page Load](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/staff_dashboard_full_load_1773768676527.png)
*Full page load: "Staff Dashboard" h2 + "City Heart Clinic · Good morning!" subtitle. "View All Appointments" contained button (CalendarMonthIcon, teal). 4 KPI cards: 12 (teal top-border), 3 (green top-border), 1 (red top-border), 4 (blue top-border). Patient Queue: Emma Wilson (Checked-In chip, no Check In button), Omar Hassan (Scheduled chip + Check In button), Lily Chen (Scheduled chip + Check In button). "Manage All Appointments" full-width outlined button. Recent Activity feed: 4 items with green/red/blue icons.*

![Patient Queue + Recent Activity + Clinic Capacity (scrolled)](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/staff_activity_capacity_panels_1773768780940.png)
*Scrolled view showing: Patient Queue (all 3 patients with chips), Recent Activity (4 items with icons and teal timestamps), Clinic Capacity (Room 1A 8/10 slots — long teal bar, Room 2B 5/8 slots — medium bar, Room 3C 3/6 slots — shorter bar). All bars confirmed TEAL.*

---

## Mock Data Reference

**KPI Cards (hardcoded):**
| Label | Value | Subtitle | Border Color |
|-------|-------|----------|--------------|
| Today's Appointments | 12 | 3 completed | #006D77 (teal) |
| Checked In | 3 | Currently waiting | #2DC653 (green) |
| Cancellations Today | 1 | 1 slot freed | #E63946 (red) |
| New Registrations | 4 | This week | #3A86FF (blue) |

**Patient Queue (QUEUE const):**
| Name | Time | Room | Status |
|------|------|------|--------|
| Emma Wilson | 10:00 | 3A | checked-in |
| Omar Hassan | 11:00 | 3A | scheduled |
| Lily Chen | 14:00 | 2B | scheduled |

**Recent Activity (RECENT_ACTIVITY const):**
| Icon | Text | Time |
|------|------|------|
| CheckCircle (green) | Emma Wilson checked in for 10:00 appt | 10 min ago |
| Cancel (red) | Omar Hassan cancelled 14:00 appointment | 35 min ago |
| Person (blue) | New patient Lily Chen registered | 1h ago |
| CheckCircle (green) | James Brown confirmed tomorrow's session | 2h ago |

---

## TC-STFDS-01 — Page Load

| | |
|---|---|
| **Expected** | "Staff Dashboard" h2; "City Heart Clinic · Good morning!" subtitle; "View All Appointments" button |
| **Actual** | ✅ **"Staff Dashboard"** h2 (fontWeight 700). Subtitle: **"City Heart Clinic · Good morning!"** (body2, text.secondary). **"View All Appointments"** contained button (CalendarMonthIcon, teal). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 35–40: `<Typography variant="h2">Staff Dashboard</Typography>`, subtitle, contained Button. |

---

## TC-STFDS-02 — KPI Cards: Values

| | |
|---|---|
| **Expected** | Today's Appointments=12, Checked In=3, Cancellations Today=1, New Registrations=4; colour-coded top borders |
| **Actual** | ✅ All 4 cards confirmed: **12** (teal #006D77, EventNoteIcon, "3 completed"), **3** (green #2DC653, CheckCircleIcon, "Currently waiting"), **1** (red #E63946, CancelIcon, "1 slot freed"), **4** (blue #3A86FF, PersonIcon, "This week"). Each card has: coloured top border (`borderTop: 4px solid ${color}`), value in matching colour, matching faded icon at top right. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 45–65: KPI array with hardcoded values. Line 52: `borderTop: \`4px solid ${color}\``. Line 56: `color: k.color` on h3 value. |

---

## TC-STFDS-03 — "View All Appointments" Navigation

| | |
|---|---|
| **Input** | Click "View All Appointments" button |
| **Expected** | Navigates to `/staff/appointments` |
| **Actual** | ✅ Clicked "View All Appointments". URL changed to **`/staff/appointments`**. Staff Appointments table visible (4 rows). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 38–40: `onClick={() => navigate('/staff/appointments')}`. |

---

## TC-STFDS-04 — Patient Queue: Shows 3 Patients

| | |
|---|---|
| **Expected** | Emma Wilson (10:00, Room 3A, checked-in), Omar Hassan (11:00, Room 3A, scheduled), Lily Chen (14:00, Room 2B, scheduled) |
| **Actual** | ✅ "Today's Patient Queue" h5 heading. All 3 patients visible: **Emma Wilson** (EW avatar, 10:00, Room 3A), **Omar Hassan** (OH avatar, 11:00, Room 3A), **Lily Chen** (LC avatar, 14:00, Room 2B). Teal avatars with correct initials derived via `name.split(' ').map(n => n[0]).join('')`. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 22–26: QUEUE const. Lines 75–100: QUEUE.map() rendering. |

---

## TC-STFDS-05 — Patient Queue: Status Chips

| | |
|---|---|
| **Expected** | checked-in → green (#D1FAE5 bg / #065F46 text); scheduled → teal (#E8F8F9 bg / #006D77 text) |
| **Actual** | ✅ **Emma Wilson**: "Checked-In" chip — **green background** (#D1FAE5), **dark green text** (#065F46). **Omar Hassan** and **Lily Chen**: "Scheduled" chips — **teal background** (#E8F8F9), **teal text** (#006D77). All chips have `fontWeight: 700`, `textTransform: 'capitalize'`. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 91–93: `bgcolor: p.status === 'checked-in' ? '#D1FAE5' : '#E8F8F9'`, `color: p.status === 'checked-in' ? '#065F46' : '#006D77'`. |

---

## TC-STFDS-06 — Patient Queue: Check In Button Visibility

| | |
|---|---|
| **Expected** | "Check In" button shown ONLY for scheduled patients; absent for checked-in |
| **Actual** | ✅ **Emma Wilson** (checked-in): **NO "Check In" button**. **Omar Hassan** (scheduled): **"Check In" outlined button visible**. **Lily Chen** (scheduled): **"Check In" outlined button visible**. |
| **Status** | ✅ **PASS** |
| **Source** | Line 96: `{p.status === 'scheduled' && <Button size="small" variant="outlined">Check In</Button>}`. |

---

## TC-STFDS-07 — Patient Queue: Check In — No Handler (Bug)

| | |
|---|---|
| **Input** | Click "Check In" on Omar Hassan |
| **Expected** | **BUG:** No onClick handler — nothing happens |
| **Actual** | ❌ Clicked **"Check In"** button on Omar Hassan. **Nothing happened** — no status change from "scheduled" to "checked-in", no visual update, no console output. Omar Hassan still shows "Scheduled" chip after click. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 97: `<Button size="small" variant="outlined">Check In</Button>` — **no `onClick` prop**. |

---

## TC-STFDS-08 — "Manage All Appointments" Navigation

| | |
|---|---|
| **Input** | Click "Manage All Appointments" full-width outlined button below queue |
| **Expected** | Navigates to `/staff/appointments` |
| **Actual** | ✅ Clicked "Manage All Appointments". URL changed to **`/staff/appointments`**. Same destination as TC-03's "View All Appointments" button. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 102–104: `onClick={() => navigate('/staff/appointments')}` — `fullWidth variant="outlined"`. |

---

## TC-STFDS-09 — Recent Activity Feed

| | |
|---|---|
| **Expected** | 4 activity items with icon, text, teal timestamp; Dividers between items |
| **Actual** | ✅ All 4 items confirmed: **"Emma Wilson checked in for 10:00 appt"** (10 min ago), **"Omar Hassan cancelled 14:00 appointment"** (35 min ago), **"New patient Lily Chen registered"** (1h ago), **"James Brown confirmed tomorrow's session"** (2h ago). Teal timestamps (#83C5BE, fontWeight 600). **Dividers** between items 1–2, 2–3, 3–4 (not after last). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 15–20: RECENT_ACTIVITY const with static strings. Lines 115–126: `.map()` with `{i < RECENT_ACTIVITY.length - 1 && <Divider />}`. |

---

## TC-STFDS-10 — Activity Feed: Icon Colours

| | |
|---|---|
| **Expected** | CheckCircle → green #2DC653; Cancel → red #E63946; Person → blue #3A86FF |
| **Actual** | ✅ Items 1 + 4 (CheckCircle): **green #2DC653**. Item 2 (Cancel): **red #E63946**. Item 3 (Person): **blue #3A86FF**. Icons visible as small filled circles (fontSize: 18). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 16–19: Icon `sx={{ color: '#2DC653' }}`, `sx={{ color: '#E63946' }}`, `sx={{ color: '#3A86FF' }}`. |

---

## TC-STFDS-11 — Clinic Capacity: Progress Bars

| | |
|---|---|
| **Expected** | Room 1A: 8/10 (80%), Room 2B: 5/8 (62.5%), Room 3C: 3/6 (50%); slot labels |
| **Actual** | ✅ **Room 1A**: "8/10 slots" label — progress bar ~80% full (longest bar). **Room 2B**: "5/8 slots" — ~62.5% (medium). **Room 3C**: "3/6 slots" — 50% (shorter). `LinearProgress variant="determinate" value={(used/total) * 100}`. Labels: `{used}/{total} slots` in caption text. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 135–155: 3 rooms. Line 147: `value={(used/total) * 100}`. Line 143: `{used}/{total} slots` label. |

---

## TC-STFDS-12 — Clinic Capacity: Teal Bars (Below 85% Threshold)

| | |
|---|---|
| **Expected** | All 3 bars TEAL (#006D77); none exceeds 0.85 threshold |
| **Actual** | ✅ All 3 bars confirmed **TEAL** (#006D77) in screenshot. Room 1A: 8/10 = **0.80** (not > 0.85 → teal). Room 2B: 5/8 = **0.625** (teal). Room 3C: 3/6 = **0.50** (teal). None renders red. |
| **Status** | ✅ **PASS** |
| **Source** | Line 151: `bgcolor: used/total > 0.85 ? '#E63946' : '#006D77'`. |

---

## TC-STFDS-13 — Clinic Capacity: >85% → Red (Source-Verified)

| | |
|---|---|
| **Expected** | If a room has `used/total > 0.85`, progress bar turns red (#E63946) |
| **Actual** | ✅ **Source-verified only** — no current mock room exceeds 85% (closest is Room 1A at 80%). Logic confirmed at line 151: `used/total > 0.85 ? '#E63946' : '#006D77'`. A room at 9/10 (90%) = 0.90 > 0.85 → would render red. |
| **Status** | ✅ **PASS (source-verified)** |
| **Source** | Line 151: ternary condition. Not currently testable with live mock data. |

---

## Edge Cases

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | Check In button clicked | No handler; Omar Hassan status stays "scheduled"; no state change | ❌ Bug (TC-07) |
| **E2** | Resize to mobile (< md breakpoint) | Cards use `xs={6}` → 2 per row on mobile, `md={3}` → 4 per row on desktop | ✅ Source-verified (responsive Grid) |
| **E3** | Activity timestamps are static strings ("2h ago") | No dayjs/moment: pure hardcoded strings. On page refresh, timestamps don't change. | ✅ Expected — no dynamic time |

---

## Observations

| # | Observation | Impact |
|---|-------------|--------|
| **OBS-1** | "Check In" button has no onClick — core staff workflow blocked | 🔴 High — Primary staff action missing |
| **OBS-2** | No `useState` in component — no interactive state at all; Check In would require state to update chip colour | 🔴 High — No state management for queue |
| **OBS-3** | All data is hardcoded at module level (QUEUE, RECENT_ACTIVITY) — no live data connection possible without refactor | 🟡 Medium — Development-only |
| **OBS-4** | Activity timestamps are static strings ("10 min ago", "2h ago"). On page refresh they don't change. | 🟡 Medium — Misleading in production |
| **OBS-5** | "Manage All Appointments" and "View All Appointments" both navigate to the same route — no differentiation | 🟢 Low — Intentional duplicate CTAs |
| **OBS-6** | Room 3C (50%) and 3C (50%): no amber threshold. Only teal/red — no warning colour for moderate utilisation (e.g. 60–85%). | 🟢 Low — Design decision |
