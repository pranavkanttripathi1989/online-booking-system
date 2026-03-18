# Clinician Dashboard — Test Suggestions

**Derived from:** [clinician-dashboard-test-results.md](../test-result/clinician-dashboard-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Dashboard.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Functional Gaps

### SUG-CLDASH-001 — Wire "Add Block" Button (BUG-CLDASH-001)

**Problem:** Line 178: `<Button variant="outlined" startIcon={<Add />}>Add Block</Button>` has **no `onClick`**. Clicking it does nothing. This is a key workflow action — clinicians need to block time for admin/personal use.

**Fix:**
```jsx
// Option A: Open a drawer
const [blockDrawerOpen, setBlockDrawerOpen] = useState(false);

<Button onClick={() => setBlockDrawerOpen(true)} ...>Add Block</Button>

<Drawer anchor="right" open={blockDrawerOpen} onClose={() => setBlockDrawerOpen(false)}>
  {/* Block creation form: startTime, endTime/duration, reason */}
</Drawer>
```

**Option B:** Navigate to blocks management page:
```jsx
<Button onClick={() => navigate('/clinician/blocks/new')} ...>Add Block</Button>
```

**Priority:** 🔴 High | **Effort:** Medium (requires new mutation + form)

---

### SUG-CLDASH-002 — Wire Timeline Appointment Block Click (BUG-CLDASH-002)

**Problem:** Line 245: `onClick={() => console.log('Selected Appt', appt.id)}` — only logs to console. No UI change occurs when a clinician clicks an appointment in the timeline. Should show a detail drawer or card.

**Fix:**
```js
const [selectedAppt, setSelectedAppt] = useState(null);
```

```jsx
// Timeline block:
onClick={() => setSelectedAppt(appt)}

// Detail drawer:
<Drawer anchor="right" open={!!selectedAppt} onClose={() => setSelectedAppt(null)}>
  {selectedAppt && (
    <Box p={3}>
      <Typography variant="h5">{selectedAppt.patient.firstName} {selectedAppt.patient.lastName}</Typography>
      <Typography>{selectedAppt.startTime} · {selectedAppt.duration || 30} mins</Typography>
      {selectedAppt.type === 'video' && (
        <Button onClick={() => navigate('/video-consultation/' + selectedAppt.id)}>Join Call</Button>
      )}
    </Box>
  )}
</Drawer>
```

**Priority:** 🔴 High | **Effort:** Medium

---

### SUG-CLDASH-003 — Wire "View Notes" Button in Upcoming Next

**Problem:** Line 339: `<Button variant="outlined" fullWidth>View Notes</Button>` has no `onClick`. Clicking it does nothing.

**Fix:**
```jsx
<Button variant="outlined" fullWidth onClick={() => navigate('/patients/' + nextAppt.patient.id + '/notes')}>
  View Notes
</Button>
```

**Priority:** 🔴 High | **Effort:** 1 line

---

### SUG-CLDASH-004 — Add Mock Appointment Data for Offline Testing

**Problem:** The timeline, "Upcoming Next" panel, and queue all show empty/fallback state when backend is offline. Unlike the KPI cards (which use `|| 12/5/7/3`), the appointment-dependent panels have no mock data fallback, so 6 out of 16 TCs are always SKIPPED.

**Fix — Add mock appointments array:**
```js
const MOCK_APPOINTMENTS = [
  { id: 'a1', startTime: '09:00', endTime: '09:30', duration: 30, status: 'completed', type: 'in-person',
    patient: { id: 'p1', firstName: 'Emma', lastName: 'Wilson' }, product: { id: 'pr1', name: 'General Consultation' } },
  { id: 'a2', startTime: '10:00', endTime: '11:00', duration: 60, status: 'scheduled', type: 'video',
    patient: { id: 'p2', firstName: 'Lily', lastName: 'Chen' }, product: { id: 'pr2', name: 'Video Consultation' } },
  { id: 'a3', startTime: '11:30', endTime: '12:00', duration: 30, status: 'scheduled', type: 'in-person',
    patient: { id: 'p3', firstName: 'James', lastName: 'Brown' }, product: { id: 'pr3', name: 'Follow-up' } },
  { id: 'a4', startTime: '14:00', endTime: '14:30', duration: 30, status: 'scheduled', type: 'in-person',
    patient: { id: 'p4', firstName: 'Amir', lastName: 'Patel' }, product: { id: 'pr4', name: 'Specialist Review' } },
];
const MOCK_LUNCH = [{ id: 'lb1', startTime: '12:30', endTime: '13:30', duration: 60 }];

// In component:
const allAppointments = data?.getAppointments || (error ? MOCK_APPOINTMENTS : []);
const lunchBreaks = data?.getLunchBreaks || (error ? MOCK_LUNCH : []);
```

**Priority:** 🔴 High | **Enables:** TC-CLDASH-05, 08, 09, 10, 12, 14 — all currently SKIPPED

---

## 🟡 Medium Priority — Validation & UX Gaps

### SUG-CLDASH-005 — Fix Fallback Name: "Dr. Doctor" is Awkward

**Problem:** When `data?.getClinician` is null (offline), the fallback `{ name: 'Doctor' }` renders as **"Dr. Doctor"**.

**Fix:**
```js
const clinician = data?.getClinician || { name: '—', clinicianType: 'Clinician', clinic: { name: 'Clinic' } };
// Renders as "Dr. —" which is clearly a placeholder
```

Or:
```jsx
<Typography variant="h5" color="white" fontWeight={800}>
  {clinician.name ? `Dr. ${clinician.name}` : user?.email || 'Doctor'}
</Typography>
```

**Priority:** 🟡 Medium | **Effort:** 2 lines

---

### SUG-CLDASH-006 — Guard Against Invalid startTime Format (E1)

**Problem:** `getTopAndHeight('invalid-time', 30)` → `split(':')` → `['invalid-time']` → `[NaN, NaN]` → `topPx = NaN`. Block not positioned (not rendered at all or at `top: NaN`).

**Fix:**
```js
const getTopAndHeight = (startTime, durationOrEndTime) => {
  if (!startTime || !startTime.includes(':')) return { top: 0, height: 36 }; // safe fallback
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { top: 0, height: 36 };
  // ... rest unchanged
};
```

**Priority:** 🟡 Medium | **Effort:** 3 lines

---

### SUG-CLDASH-007 — Prevent Overlapping Appointment Blocks (E5)

**Problem:** Multiple appointments at the same time use identical `left: 64, right: 12` — they overlap completely, hiding each other.

**Fix (simplified side-by-side):**
```js
// After filtering dayEvents, detect overlaps and assign column index:
const getColumnIndex = (appt, allAppts) => {
  const earlier = allAppts.filter(a => a.id !== appt.id && a.startTime < appt.startTime && a.endTime > appt.startTime);
  return earlier.length; // column 0, 1, 2...
};
```

Then apply fractional `left` / `right` per column.

**Priority:** 🟡 Medium

---

## 🟢 Low Priority — UX Improvements

### SUG-CLDASH-008 — Add "Current Time" Indicator on Timeline

```jsx
// Current time red line
const nowMins = dayjs().hour() * 60 + dayjs().minute();
const nowTop = (nowMins - START_MINS) * PIXELS_PER_MIN;
{nowTop >= 0 && nowTop <= 720 && (
  <Box sx={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, bgcolor: 'error.main', zIndex: 20 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', position: 'absolute', left: 56, top: -3 }} />
  </Box>
)}
```

**Priority:** 🟢 Low

---

### SUG-CLDASH-009 — KPI Cards: Distinguish Live vs Fallback

**Problem:** KPI values 12/5/7/3 look the same whether from real data or fallback. Users have no indication the data is stale/mocked.

**Fix:** Show a subtle indicator:
```jsx
{error && <Typography variant="caption" color="warning.main">⚠ Offline — showing demo data</Typography>}
```

**Priority:** 🟢 Low

---

### SUG-CLDASH-010 — Auto-Refresh: Show Last Updated Timestamp

Since page auto-refreshes every 60s, show "Last updated: 2 min ago" in the header.

```js
const [lastRefresh, setLastRefresh] = useState(dayjs());
// In interval:
setInterval(() => { refetch(); setLastRefresh(dayjs()); }, 60000);
```

```jsx
<Typography variant="caption" color="rgba(255,255,255,0.6)">
  Updated {dayjs().diff(lastRefresh, 'minute')} min ago
</Typography>
```

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Scenarios

### SUG-CLDASH-PLAN-001 — Add TC: Timeline Block Colours for Each Status

> **TC-CLDASH-08B** — Verify all 3 status colours in timeline  
> Requires mock data. With MOCK_APPOINTMENTS:  
> 'completed' → `#2DC653` green.  
> 'scheduled' → `#006D77` teal.  
> 'cancelled' → `#E63946` red.  
> Source: `getStatusColor` function (lines 139–145).

### SUG-CLDASH-PLAN-002 — Add TC: Product Name Hidden on Short Blocks

> **TC-CLDASH-08C** — Height > 30px threshold for product name  
> Source line 252: `{height > 30 && <Typography>{appt.product?.name}</Typography>}`.  
> 30-min block: `height = 30 * 1.2 = 36 > 30` → product name visible.  
> 20-min block: `height = 20 * 1.2 = 24 < 30` → product name hidden.

### SUG-CLDASH-PLAN-003 — Add TC: Gravatar Avatar Loads

> **TC-CLDASH-12B** — Upcoming Next avatar  
> With `nextAppt.patient.id`, avatar URL = `https://www.gravatar.com/avatar/{id}?d=mp`.  
> Verify default avatar image loads (mp = mystery person fallback).  
> Check width/height = 56px, border = `2px solid #006D7730`.

### SUG-CLDASH-PLAN-004 — Add TC: "Start Session" Video-Only

> **TC-CLDASH-12C** — "Start Session" shown only for video type  
> With in-person next appointment: only "View Notes" shown (no "Start Session").  
> With video next appointment: both "View Notes" + "Start Session" shown.  
> Click "Start Session" → navigate to `/video-consultation/{id}`.

### SUG-CLDASH-PLAN-005 — Add TC: Queue Capped at 4

> **TC-CLDASH-14B** — Queue max 4 items  
> Add 6 upcoming appointments. `nextAppt` = first one. `queue = slice(0, 4)` = next 4.  
> Verify exactly 4 items in queue list, even with 5+ upcoming.

### SUG-CLDASH-PLAN-006 — Add TC: Refresh Interval Persists on Navigation

> **TC-CLDASH-16B** — Cleanup on unmount  
> Source line 83: `return () => clearInterval(interval)`.  
> Navigate away and back to verify no duplicate intervals accumulate.  
> Test: check browser DevTools for multiple refetch calls per minute.

### SUG-CLDASH-PLAN-007 — Add TC: Timeline Scrolls to Current Time

> **TC-CLDASH-07B** — Timeline initial scroll position  
> Currently, timeline starts at 08:00. If current time is 14:00, user must manually scroll.  
> Enhancement suggestion: scroll to current time on mount using a `useRef` and `scrollIntoView`.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-CLDASH-001 | Wire Add Block button | 🐛 Bug Fix | 🔴 High |
| SUG-CLDASH-002 | Wire timeline block click → drawer | 🐛 Bug Fix | 🔴 High |
| SUG-CLDASH-003 | Wire "View Notes" onClick | 🐛 Bug Fix | 🔴 High |
| SUG-CLDASH-004 | Add mock appointment data for offline | 🧪 Test Infra | 🔴 High |
| SUG-CLDASH-005 | Fix "Dr. Doctor" fallback name | ✨ UX | 🟡 Medium |
| SUG-CLDASH-006 | Guard against invalid startTime format | 🛡 Validation | 🟡 Medium |
| SUG-CLDASH-007 | Overlap handling for same-time blocks | ✨ UX | 🟡 Medium |
| SUG-CLDASH-008 | Current time red line indicator | ✨ UX Polish | 🟢 Low |
| SUG-CLDASH-009 | Show offline/stale data indicator | ✨ UX | 🟢 Low |
| SUG-CLDASH-010 | Show "last updated" timestamp | ✨ UX | 🟢 Low |

### Quick Wins (< 5 min each):
- **SUG-CLDASH-003**: Add `onClick={() => navigate('/patients/' + nextAppt.patient.id + '/notes')}` to View Notes (1 line)
- **SUG-CLDASH-005**: Change fallback `name: 'Doctor'` to `name: '—'` (1 word)
- **SUG-CLDASH-006**: Add NaN guard in `getTopAndHeight` (3 lines)
