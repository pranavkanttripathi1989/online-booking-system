# Clinician Calendar — Test Suggestions

**Derived from:** [clinician-calendar-test-results.md](../test-result/clinician-calendar-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Calendar.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Functional Gaps

### SUG-CLCAL-001 — Week Navigation Does NOT Update Displayed Dates (OBS-2)

**Problem:** The most significant gap in the calendar. Clicking `<` / `>` updates the `weekLabel` chip ("This Week", "Next Week") but the **actual day header dates are hardcoded**:

```jsx
// Line 90 — hardcoded forever:
{20 + dayIdx}  // always shows 20, 21, 22, 23, 24, 25, 26
```

Similarly, the `EVENTS` array is static — events never change regardless of weekOffset. This means "Next Week" shows the same events as "This Week".

**Fix — Derive dates dynamically from weekOffset:**
```js
import dayjs from 'dayjs';

// In component:
const today = dayjs();
const startOfWeek = today.startOf('week').add(weekOffset, 'week');
const weekDates = DAYS.map((_, i) => startOfWeek.add(i + 1, 'day')); // Mon offset
```

```jsx
// In day header (line 90):
{weekDates[dayIdx].date()}  // dynamic date number
```

**Priority:** 🔴 High | **Effort:** Medium — requires dayjs integration and EVENTS refactor

---

### SUG-CLCAL-002 — "View Patient" Button Has No onClick Handler (OBS-3)

**Problem:** Line 164: `<Button variant="outlined">View Patient</Button>` — no `onClick` handler. Clicking it does nothing.

**Fix:**
```jsx
<Button variant="outlined" onClick={() => navigate(`/patients/${selected.id}`)}>
  View Patient
</Button>
```

Or if a separate patientId is stored: `navigate('/patients/' + selected.patientId)`.

**Priority:** 🔴 High | **Effort:** 1 line

---

### SUG-CLCAL-003 — Hardcoded Clinician Name/Clinic (OBS-4)

**Problem:** Line 45: `<Typography>Dr. James Wilson · City Heart Clinic</Typography>` — always hardcoded, regardless of who is logged in.

When logged in as "Dr. Sarah Mitchell" (Clinician), the subtitle still shows "Dr. James Wilson", which is incorrect.

**Fix:**
```js
const { user } = useAuth();
// In subtitle:
<Typography variant="body2" color="text.secondary">
  {user?.full_name || 'Dr.'} · {user?.clinic?.name || 'Clinic'}
</Typography>
```

**Priority:** 🔴 High | **Effort:** 2 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-CLCAL-004 — Fix Negative weekOffset Label (E2, OBS-1)

**Problem:** `weekOffset = -1` produces `"Week +-1"` which is grammatically awkward and confusing.

**Current code (line 37):**
```js
const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `Week +${weekOffset}`;
```

**Fix — handle all cases:**
```js
const weekLabel =
  weekOffset === 0  ? 'This Week'
  : weekOffset === 1  ? 'Next Week'
  : weekOffset === -1 ? 'Last Week'
  : weekOffset < 0    ? `${Math.abs(weekOffset)} Weeks Ago`
  : `Week +${weekOffset}`;
```

**Priority:** 🟡 Medium | **Effort:** 5 lines

---

### SUG-CLCAL-005 — Overlap Detection for Same-Time Events (E5)

**Problem:** Multiple events at the same time in the same column all use `left: 2, right: 2, position: 'absolute'` — they overlap completely, hiding each other.

**Fix — Side-by-side rendering:**
```js
// Group events by overlap, assign column index
const getEventColumns = (events) => {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const columns = [];
  sorted.forEach(ev => {
    let placed = false;
    for (let col of columns) {
      if (col[col.length - 1].end <= ev.start) {
        col.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([ev]);
  });
  return columns;
};
```

Then give each event a fractional `left` and `right` based on its column index.

**Priority:** 🟡 Medium | **Effort:** ~40 lines

---

### SUG-CLCAL-006 — Connect to Real Backend (GraphQL)

**Problem:** The entire calendar uses a static `EVENTS` array. Appointments booked through the app never appear in the calendar.

**Fix — Replace static data with query:**
```js
const GET_CLINICIAN_SCHEDULE = gql`
  query GetClinicianSchedule($clinicianId: ID!, $weekStart: String!, $weekEnd: String!) {
    getClinicianAppointments(clinicianId: $clinicianId, from: $weekStart, to: $weekEnd) {
      id
      patientName
      appointmentType
      startTime
      endTime
      status
    }
  }
`;
```

**Priority:** 🟡 Medium | **Effort:** Large — requires backend endpoint + data mapping

---

## 🟢 Low Priority — UX Polish

### SUG-CLCAL-007 — "Current Time" Red Line Indicator

Many calendar apps show a horizontal red line at the current time within the grid.

```jsx
// In day column (only for today's column):
const now = dayjs();
const currentTimePx = (now.hour() + now.minute() / 60 - 9) * GRID_ROW;
{isToday && currentTimePx >= 0 && currentTimePx <= 9 * GRID_ROW && (
  <Box sx={{ position: 'absolute', top: currentTimePx, left: 0, right: 0, height: 2, bgcolor: 'error.main', zIndex: 10 }} />
)}
```

**Priority:** 🟢 Low

---

### SUG-CLCAL-008 — Responsive Grid Scroll

**Problem:** On narrow screens, 7 day columns may overflow. No horizontal scroll is visible at `/clinician/calendar`.

**Fix:** Wrap the grid in `<Box sx={{ overflowX: 'auto' }}>` with a `minWidth` that prevents column collapse.

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-CLCAL-PLAN-001 — Add TC: Week Navigation Does NOT Change Dates

> **TC-CLCAL-02C** — Verify dates remain hardcoded during navigation  
> Click `>` (Next Week). Observe day header dates. Expected actual with current code: dates still show 20–26. Expected behavior with fix: dates should advance by 7.  
> **This TC would currently FAIL** with correct expected behavior.

### SUG-CLCAL-PLAN-002 — Add TC: "View Patient" Button Navigation

> **TC-CLCAL-14B** — View Patient navigates to patient detail  
> Click Emma Wilson event → detail card. Click "View Patient".  
> Expected: navigate to `/patients/{id}`. Actual: **nothing happens** (no onClick). Must be fixed first.

### SUG-CLCAL-PLAN-003 — Add TC: Hardcoded vs Real Clinician Name

> **TC-CLCAL-01B** — Subtitle matches logged-in clinician  
> Log in as Dr. Sarah Mitchell (Clinician). Observe subtitle.  
> Expected: "Dr. Sarah Mitchell · [Clinic Name]". Actual: "Dr. James Wilson · City Heart Clinic" — **hardcoded mismatch**.

### SUG-CLCAL-PLAN-004 — Add TC: "Join Call" Navigation

> **TC-CLCAL-15B** — Join Call navigates to video room  
> Click Lily Chen (video event). Click "Join Call".  
> Expected: navigate to `/video/4` (id=4 from EVENTS). Source: `navigate('/video/' + selected.id)`.  
> Test: verify URL becomes `/video/4`.

### SUG-CLCAL-PLAN-005 — Add TC: Event at 17:00 (E1)

> **TC-CLCAL-08B** — Event at end-of-grid time  
> Add `{ id:10, day:0, start:17, end:17.5, patient:'Test', type:'in-person', color:'#006D77' }` to EVENTS.  
> Observe rendering: event at `top=480px` inside `9×60px=540px` container — just visible.  
> Verify no overflow or crash.

### SUG-CLCAL-PLAN-006 — Add TC: Event Block Emoji Mapping

> **TC-CLCAL-11B** — Each event type shows correct emoji  
> Verify: in-person = 🏥, video = 📹, break = ☕, block = 🏥 (block falls through to default '🏥'). Test plan doesn't explicitly call out that 'block' type shows 🏥. Source line 123: `ev.type === 'video' ? '📹' : ev.type === 'break' ? '☕' : '🏥'` — block uses default.

### SUG-CLCAL-PLAN-007 — Add TC: Calendar Accessible via Clinician Sidebar

> **TC-CLCAL-00** — Navigation to calendar from sidebar  
> From any clinician page, click "Calendar" in sidebar.  
> Expected: navigate to `/clinician/calendar`.  
> Screenshot confirmed: sidebar shows "Calendar" link — PASS.

### SUG-CLCAL-PLAN-008 — Add TC: Avatar Initials Derivation

> **TC-CLCAL-14C** — Avatar initials are correct  
> Click events and observe Avatar initials:  
> Emma Wilson → "EW" ✓  
> Omar Hassan → "OH"  
> Lily Chen → "LC" ✓  
> Source: `.split(' ').map(n => n[0]).join('').substring(0, 2)` — max 2 chars.  
> Edge: "Sophie M." → split → ["Sophie", "M."] → "SM" (M. includes the dot).

### SUG-CLCAL-PLAN-009 — Add TC: Saturday/Sunday Have No Events

> **TC-CLCAL-03B** — Empty columns for Sat/Sun  
> Verify Sat (idx=5) and Sun (idx=6) columns render empty grid rows with no event blocks.  
> Expected: "No services" is not shown — just empty hour rows. Columns still render correctly.

### SUG-CLCAL-PLAN-010 — Add TC: Consistent Behavior After Re-selecting Same Event

> **TC-CLCAL-12B** — Click same event twice  
> Click Emma Wilson → detail card appears. Click Emma Wilson again.  
> Expected: `selected` stays as Emma Wilson (same object); card remains visible.  
> Source: `onClick={() => setSelected(ev)}` — sets same value; no toggle behavior.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-CLCAL-001 | Week nav must update displayed dates | 🐛 Functional Gap | 🔴 High |
| SUG-CLCAL-002 | Wire "View Patient" onClick | 🐛 Functional Gap | 🔴 High |
| SUG-CLCAL-003 | Use dynamic clinician name from auth | 🐛 Functional Gap | 🔴 High |
| SUG-CLCAL-004 | Fix negative weekOffset label | ✨ UX | 🟡 Medium |
| SUG-CLCAL-005 | Overlap detection for same-time events | ✨ UX | 🟡 Medium |
| SUG-CLCAL-006 | Connect to real backend / GraphQL | 🔗 Integration | 🟡 Medium |
| SUG-CLCAL-007 | Current time red line indicator | ✨ UX Polish | 🟢 Low |
| SUG-CLCAL-008 | Responsive grid horizontal scroll | ✨ UX | 🟢 Low |

### Quick Wins (< 10 min):
- **SUG-CLCAL-002**: Add `onClick={() => navigate('/patients/' + selected.id)}` to View Patient button (1 line)
- **SUG-CLCAL-004**: Add `weekOffset === -1 ? 'Last Week' : weekOffset < 0 ? '...' : ...` (3 lines)
- **SUG-CLCAL-003**: Replace hardcoded name with `user?.full_name` from `useAuth()` (2 lines)
