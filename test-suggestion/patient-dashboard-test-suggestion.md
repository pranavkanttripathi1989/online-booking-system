# Patient Dashboard — Test Suggestions

**Derived from:** [patient-dashboard-test-results.md](../test-result/patient-dashboard-test-results.md)  
**Source File:** `frontend/src/pages/patient/Dashboard.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-PTDASH-001 — Register `/booking/search` Route in App.jsx (OBS-1)

**Problem:** "Book Appointment" (banner), "Find a Doctor" (empty state), and both navigate to `/booking/search` — which returns 404. This is the **primary CTA** on the patient dashboard, making it the highest priority bug.

**Fix — Add route in App.jsx:**
```jsx
import BookingSearch from './pages/patient/BookingSearch';

// In router:
<Route path="/booking/search" element={<BookingSearch />} />
```

Or redirect to the existing appointments booking page:
```jsx
<Route path="/booking/search" element={<Navigate to="/appointments/book" />} />
```

**Priority:** 🔴 High | **Effort:** 2 lines in App.jsx

---

### SUG-PTDASH-002 — Register `/clinician/:id` Route (TC-PTDASH-14 / OBS-2)

**Problem:** "Book" button in "Your Doctors" sidebar navigates to `/clinician/${clinician.id}` — route not registered → 404.

**Fix — Add route in App.jsx:**
```jsx
import ClinicianProfile from './pages/patient/ClinicianProfile';
<Route path="/clinician/:id" element={<ClinicianProfile />} />
```

**Priority:** 🔴 High | **Effort:** 2 lines in App.jsx

---

### SUG-PTDASH-003 — Implement Reschedule and Cancel Handlers (TC-PTDASH-10)

**Problem:** Lines 258–259: Reschedule and Cancel buttons have no `onClick`. Documented bug in test plan.

**Fix:**
```jsx
const handleReschedule = (apptId) => navigate(`/patient/appointments?reschedule=${apptId}`);
const handleCancel = (apptId) => {
  // Show confirmation dialog before cancellation
  if (window.confirm('Are you sure you want to cancel this appointment?')) {
    // Call CANCEL_APPOINTMENT mutation
    console.log('cancel', apptId); // placeholder
  }
};

// Update buttons:
<Button variant="outlined" size="small" onClick={() => handleReschedule(appt.id)}>Reschedule</Button>
<Button color="error" size="small" onClick={() => handleCancel(appt.id)}>Cancel</Button>
```

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-PTDASH-004 — Add Mock Data Fallback for Offline Testing

**Problem:** All 5 appointment-card TCs (TC-08/09/11/12/15) are SKIPPED because `upcomingAppointments = []` when the backend is offline. No mock data fallback like other pages have.

**Fix:**
```js
const MOCK_UPCOMING = [
  {
    id: 'm1', startTime: '2026-03-20T10:00:00Z', endTime: '2026-03-20T10:30:00Z',
    status: 'scheduled', type: 'video', duration: 30,
    clinician: { id: 'c1', name: 'Dr. Sarah Johnson', clinicianType: 'Cardiologist' },
  },
];
const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Appointment Confirmed', message: 'Your appointment with Dr. Sarah Johnson...', type: 'appointment', createdAt: new Date().toISOString() },
];
const MOCK_KPIS = { total: 12, completed: 9, upcoming: 1, cancelled: 2 };

// In component:
const upcomingAppointments = data?.getPatientAppointments || MOCK_UPCOMING;
const notifications = data?.getNotifications || MOCK_NOTIFICATIONS;
const kpis = data?.getPatientKpis || { ...MOCK_KPIS, upcoming: upcomingAppointments.length };
```

**Priority:** 🔴 High | **Enables:** TC-08, 09, 11, 12, 14, 15 (6 currently SKIPPED TCs)

---

## 🟡 Medium Priority — UX Improvements

### SUG-PTDASH-005 — Add Loading Skeleton for Apollo Query (OBS-3)

**Problem:** Line 160 comment: "Not blocking on loading". When backend is slow (not offline), page renders with zeros and empty states, then reflows when data arrives. This causes layout shift (CLS).

**Fix:**
```jsx
if (loading) return (
  <Box>
    {renderWelcomeBanner()}
    <Grid container spacing={2} mb={4}>
      {[1,2,3,4].map(i => <Grid item xs={6} sm={3} key={i}><Skeleton variant="rectangular" height={80} sx={{ borderRadius: 3 }} /></Grid>)}
    </Grid>
    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
  </Box>
);
```

**Priority:** 🟡 Medium | **Effort:** ~10 lines

---

### SUG-PTDASH-006 — Dynamic Greeting Based on Time of Day (OBS-5)

**Problem:** "Good morning" is hardcoded. At 3 PM, it still says "Good morning".

**Fix:**
```js
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};
// Usage: `${getGreeting()}, ${user?.firstName || ...}`
```

**Priority:** 🟡 Medium | **Effort:** 5 lines

---

### SUG-PTDASH-007 — Client-Side Notification Count Limit (Edge Case E3)

**Problem:** Query uses `limit: 5` server-side, but the client render has no `.slice(0, 5)`. If the server ignores the limit or returns more, all notifications render.

**Fix:**
```jsx
{notifications.slice(0, 5).map((notif, idx) => (...))}
```

**Priority:** 🟡 Medium | **Effort:** 1 line

---

### SUG-PTDASH-008 — Add Apollo Error State Display

**Problem:** The component uses `const { data, loading, error } = useQuery(...)` (line 85) but never renders the `error` — it silently falls back to empty arrays with no indication to the user that data failed to load.

**Fix:**
```jsx
{error && (
  <Alert severity="warning" sx={{ mb: 2 }}>
    Could not load dashboard data. Showing cached information.
  </Alert>
)}
```

**Priority:** 🟡 Medium | **Effort:** 5 lines

---

## 🟢 Low Priority — Polish

### SUG-PTDASH-009 — Use Patient Email Hash for Gravatar (OBS-4)

**Problem:** Gravatar URL uses `user.id` as hash. Gravatar uses MD5 of email — `user.id` will never match a real Gravatar.

**Fix:**
```js
// Use MD5 of email (requires md5 library):
import md5 from 'md5';
const gravatarHash = user?.email ? md5(user.email.toLowerCase().trim()) : user?.id;
// Avatar src: `https://www.gravatar.com/avatar/${gravatarHash}?d=mp&s=120`
```

**Priority:** 🟢 Low

---

### SUG-PTDASH-010 — Add "View All" to Recent Activity and Your Doctors

**Problem:** Both sidebar cards ("Your Doctors" and "Recent Activity") show max 3 / max 5 items but have no "View all" link. Users cannot access the full list.

**Fix:** Add links to `/patient/appointments` (doctors) and `/notifications` (activity).

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-PTDASH-PLAN-001 — TC: Welcome Banner Name Uses Correct Priority

> **TC-PTDASH-02B** — Name fallback priority order  
> Test 3 scenarios: (a) `user.firstName = "Emma"` → "Good morning, Emma"; (b) `user.firstName = undefined, user.name = "John Smith"` → "Good morning, John"; (c) Both undefined → "Good morning, Patient".

### SUG-PTDASH-PLAN-002 — TC: /booking/search Route 404 (Bug Repro)

> **TC-PTDASH-18** — Book Appointment navigates to missing route  
> Click "Book Appointment" in banner.  
> Expected (correct): `/booking/search` loads.  
> Actual (bug): 404 page shown. Documents OBS-1.

### SUG-PTDASH-PLAN-003 — TC: KPI Cards With Real Data

> **TC-PTDASH-05B** — KPI display with mock data  
> With `MOCK_KPIS = { total: 12, completed: 9, upcoming: 1, cancelled: 2 }` (after SUG-004):  
> Verify: Total Visits = 12, Completed = 9, Upcoming = 1, Cancelled = 2.  
> Verify each card icon color: blue/green/teal/red.

### SUG-PTDASH-PLAN-004 — TC: Appointment Card With Data

> **TC-PTDASH-08B** — Appointment card renders correctly (after mock fallback)  
> With 1 scheduled appointment:  
> Date block shows month (e.g., "MAR") and day (e.g., "20") in primary.main box.  
> Clinician avatar (Gravatar), name, clinicianType shown.  
> Time chip: "10:00 (30 min)". Type chip: "In-Person" or "Video Consult". Status chip: "Scheduled".

### SUG-PTDASH-PLAN-005 — TC: Join Video Button

> **TC-PTDASH-09B** — Join Video shown for video+scheduled only  
> With video appointment (type='video', status='scheduled'): "Join Video" button (color="secondary") shown.  
> With in-person appointment: "Join Video" NOT shown.  
> With video+completed: "Join Video" NOT shown (status check).

### SUG-PTDASH-PLAN-006 — TC: Status Border Colors on Cards

> **TC-PTDASH-11B** — Card border colors per status  
> scheduled: `4px solid #006D77`. completed: `4px solid #2DC653`. cancelled: `4px solid #E63946`.  
> Source line 197.

### SUG-PTDASH-PLAN-007 — TC: Your Doctors Deduplication

> **TC-PTDASH-12B** — Unique clinicians from appointments  
> With 2 appointments sharing the same clinician.id: only 1 doctor entry in sidebar.  
> With 4 unique clinicians: only 3 shown (`.slice(0, 3)`).

### SUG-PTDASH-PLAN-008 — TC: Auth Guard for Unauthenticated User

> **TC-PTDASH-01B** — Warning alert when not logged in  
> Log out. Navigate directly to `/patient/dashboard`.  
> Expected: Alert severity="warning" "Please log in to view your dashboard." shown.  
> Expected: No crash, no white screen.

### SUG-PTDASH-PLAN-009 — TC: Notification Icon Types

> **TC-PTDASH-15B** — Notification icons per type  
> appointment → CalendarMonth (primary). payment → Payment (success). system → Settings (action). alert → Warning (error). unknown → CalendarMonth (primary default).

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-PTDASH-001 | Register /booking/search route | 🐛 Bug Fix | 🔴 High |
| SUG-PTDASH-002 | Register /clinician/:id route | 🐛 Bug Fix | 🔴 High |
| SUG-PTDASH-003 | Reschedule/Cancel handlers | 🐛 Bug Fix | 🔴 High |
| SUG-PTDASH-004 | Add mock data fallback | 🧪 Test Infra | 🔴 High |
| SUG-PTDASH-005 | Loading skeleton for Apollo | ✨ UX | 🟡 Medium |
| SUG-PTDASH-006 | Dynamic time-of-day greeting | ✨ UX | 🟡 Medium |
| SUG-PTDASH-007 | Client-side notification limit | 🛡 Guard | 🟡 Medium |
| SUG-PTDASH-008 | Show Apollo error state | 🐛 UX Bug | 🟡 Medium |
| SUG-PTDASH-009 | Correct Gravatar hash | ✨ UX | 🟢 Low |
| SUG-PTDASH-010 | "View all" in sidebar cards | ✨ UX | 🟢 Low |

### Quick Wins (2 lines each):
- **SUG-PTDASH-001**: Add `<Route path="/booking/search" element={<Navigate to="/appointments/book"/>} />` — 2 lines
- **SUG-PTDASH-002**: Add `<Route path="/clinician/:id" element={<ClinicianProfile/>} />` — 2 lines  
- **SUG-PTDASH-007**: Add `.slice(0, 5)` to notifications map — 1 line
