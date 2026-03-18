# Staff Dashboard — Test Suggestions

**Derived from:** [staff-dashboard-test-results.md](../test-result/staff-dashboard-test-results.md)  
**Source File:** `frontend/src/pages/staff/Dashboard.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-STFDS-001 — Implement "Check In" Button Handler (TC-07, E1)

**Problem:** "Check In" `<Button>` on each scheduled patient has no `onClick`. Core staff check-in workflow is broken. The component also has no `useState` — clicking would need to update queue state to change chip colour.

**Fix:**
```jsx
export default function StaffDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState(QUEUE); // ← add state

  const handleCheckIn = (name) => {
    setQueue(prev => prev.map(p =>
      p.name === name ? { ...p, status: 'checked-in' } : p
    ));
  };

  // In JSX, replace QUEUE.map with queue.map:
  {p.status === 'scheduled' && (
    <Button size="small" variant="outlined" onClick={() => handleCheckIn(p.name)}>
      Check In
    </Button>
  )}
```

After check-in:
- Chip colour changes from teal "Scheduled" to green "Checked-In"
- "Check In" button disappears
- "Checked In" KPI card count should update (currently also hardcoded)

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-STFDS-002 — Replace Static KPI Values with Derived Data

**Problem:** KPI values (12 appointments, 3 checked-in, 1 cancellation, 4 new registrations) are all hardcoded. When `handleCheckIn` is implemented, the "Checked In" KPI won't update to reflect real state.

**Fix:**
```jsx
const checkedInCount = queue.filter(p => p.status === 'checked-in').length;
// Use checkedInCount instead of hardcoded 3
```

For production: derive from Apollo query or mock appointment data.

**Priority:** 🔴 High | **Effort:** ~5 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-STFDS-003 — Add Amber Warning Threshold for Clinic Capacity (TC-12/13)

**Problem:** Only two colours exist for clinic capacity bars: teal (≤85%) and red (>85%). There is no amber/warning for moderate-to-high utilisation (e.g. 70–85%). A room at 80% should visually differ from a room at 50%.

**Fix:**
```jsx
const getBarColor = (ratio) => {
  if (ratio > 0.85) return '#E63946'; // red — critical
  if (ratio > 0.70) return '#D97706'; // amber — warning
  return '#006D77';                   // teal — normal
};

// In JSX:
'& .MuiLinearProgress-bar': { bgcolor: getBarColor(used / total) }
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

### SUG-STFDS-004 — Use Dynamic Timestamps for Activity Feed (E3)

**Problem:** Activity feed timestamps ("10 min ago", "35 min ago", "1h ago", "2h ago") are hardcoded static strings. They never change even after page refresh, making them misleading in production.

**Fix — Use `dayjs` (already in package.json) or `date-fns`:**
```jsx
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const RECENT_ACTIVITY = [
  { ..., createdAt: dayjs().subtract(10, 'minute') },
  { ..., createdAt: dayjs().subtract(35, 'minute') },
  // ...
];

// In render:
<Typography>{item.createdAt.fromNow()}</Typography> // "10 minutes ago"
```

**Priority:** 🟡 Medium | **Effort:** ~8 lines

---

### SUG-STFDS-005 — Add Clickable Activity Items

**Problem:** Activity feed items are static list items. Clicking "Emma Wilson checked in for 10:00 appt" does nothing. There's no way to navigate to the appointment or patient record.

**Fix:** Make each `<ListItem>` a button linking to the relevant entity:
```jsx
<ListItem button onClick={() => navigate(`/staff/appointments?search=${item.patient}`)}>
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

### SUG-STFDS-006 — Add Empty State for Patient Queue

**Problem:** No empty state shown if `QUEUE` is empty (e.g. no morning appointments today). The queue panel renders nothing below the heading.

**Fix:**
```jsx
{queue.length === 0 ? (
  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
    No patients scheduled for today
  </Typography>
) : queue.map((p) => ...)}
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

## Additional Test Cases

### SUG-STFDS-PLAN-001 — TC: Check In Updates Chip Colour (After SUG-001 Fix)

> **TC-STFDS-14** — Click "Check In" on Omar Hassan (scheduled).  
> Expected (after fix): Omar Hassan chip changes from teal "Scheduled" → green "Checked-In". "Check In" button disappears from Omar's row. "Checked In" KPI value increments.

### SUG-STFDS-PLAN-002 — TC: All Patients Checked In → No Check In Buttons

> **TC-STFDS-15** — Check in all scheduled patients (Omar + Lily).  
> Expected: No "Check In" buttons visible anywhere. All 3 patients show green "Checked-In" chip.

### SUG-STFDS-PLAN-003 — TC: High-Utilisation Room → Red Bar

> **TC-STFDS-16** — Change Room 1A mock data to `used: 9, total: 10` (90%).  
> Expected: Room 1A bar = RED (#E63946). Room 2B + 3C bars remain teal.  
> After SUG-003 addition: Room 1A at 9/10 = 90% also hits amber threshold at 8/10.

### SUG-STFDS-PLAN-004 — TC: Amber Warning Bar (After SUG-003)

> **TC-STFDS-17** — Set room to `used: 7, total: 9` (77.8%).  
> Expected: Bar = AMBER (#D97706) — between 70% and 85% threshold.

### SUG-STFDS-PLAN-005 — TC: KPI Card Derives from Queue State (After SUG-002)

> **TC-STFDS-18** — Check in Omar Hassan. Verify "Checked In" KPI card increments from 3 → 4.  
> Expected: `checkedInCount = queue.filter(p => p.status === 'checked-in').length` = 2 (Emma + Omar).

### SUG-STFDS-PLAN-006 — TC: Activity Item Click Navigates to Appointment

> **TC-STFDS-19** — Click "Emma Wilson checked in for 10:00 appt" activity item (after SUG-005 fix).  
> Expected: Navigates to `/staff/appointments?search=Emma` or equivalent appointment detail.

### SUG-STFDS-PLAN-007 — TC: Empty Queue → Empty State Message

> **TC-STFDS-20** — Replace QUEUE constant with empty array `[]`.  
> Expected: "No patients scheduled for today" message shown in queue panel (after SUG-006 fix).

### SUG-STFDS-PLAN-008 — TC: Responsive Layout (E2)

> **TC-STFDS-21** — Resize browser to mobile width (< 900px).  
> Expected: KPI cards collapse to 2 per row (xs=6). Patient Queue and Activity Feed stack vertically (xs=12).

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-STFDS-001 | Implement Check In onClick + useState | 🐛 Bug Fix | 🔴 High |
| SUG-STFDS-002 | Derive KPI values from state | 🐛 Bug Fix | 🔴 High |
| SUG-STFDS-003 | Amber warning for 70–85% capacity | ✨ UX | 🟡 Medium |
| SUG-STFDS-004 | Use dayjs for dynamic timestamps | ✨ Data | 🟡 Medium |
| SUG-STFDS-005 | Make activity items clickable | ✨ Feature | 🟡 Medium |
| SUG-STFDS-006 | Empty state for patient queue | ✨ UX | 🟡 Medium |

### Quick Wins (1–5 lines):
- **SUG-STFDS-006**: Empty state condition — 5 lines
- **SUG-STFDS-003**: `getBarColor()` helper function — 5 lines
- **SUG-STFDS-002**: `checkedInCount` derived from queue state — 1 line
