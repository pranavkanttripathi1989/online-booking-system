# Calendar — Feature Suggestions

**Derived from:** [calendar-test-results.md](../test-result/calendar-test-results.md)  
**Test Plan Source:** [calendar-test-plan.md](../test-plan/calendar-test-plan.md)  
**UI Plan Source:** [calendar_ui_plan.md](../calendar_ui_plan.md)  
**Date:** 2026-03-16  
**Tested by:** Antigravity AI Browser Agent

> Suggestions derived from real observations during calendar test execution and cross-reference with the `calendar_ui_plan.md` redesign checklist (all 8 prompts marked ✅ DONE as of 2026-03-13).

---

## 🔴 Bug Fixes Required

### SUG-CAL-001 — Fix: Status Filter Not Applied to FullCalendar Events
**Triggered by:** TC-CAL-009 (BUG-CAL-001)  
**File:** `src/pages/calendar/index.jsx` or `CalendarView.jsx`  
**Root Cause:** The `filterStatus` state is updated in React when the user selects a status, but the filtered events array passed to `<FullCalendar events={...}>` is not re-computed based on `filterStatus`. Likely the raw `events` array is passed directly without the status predicate, or there is a string case mismatch (`'Confirmed'` vs `'confirmed'`).  
**Fix:**
```js
// In CalendarPage.jsx, ensure you derive filteredEvents:
const filteredEvents = useMemo(() => {
  let result = events;
  if (filterClinician) result = result.filter(e => e.extendedProps?.clinicianId === filterClinician);
  if (filterClinic)    result = result.filter(e => e.extendedProps?.clinicId === filterClinic);
  if (filterStatus)    result = result.filter(e =>
    e.extendedProps?.status?.toLowerCase() === filterStatus.toLowerCase()
  );
  return result;
}, [events, filterClinician, filterClinic, filterStatus]);

// Pass filteredEvents to CalendarView, not raw events:
<CalendarView events={filteredEvents} ... />
```
**Priority:** 🔴 Critical — filter bar exists but doesn't work for status  
**Effort:** Very Low (< 15 min)

---

### SUG-CAL-002 — Fix: Calendar Event ID ↔ Appointment Detail ID Mismatch
**Triggered by:** TC-CAL-013 (BUG-CAL-002)  
**File:** `src/pages/calendar/index.jsx` — event mapping from mock store  
**Root Cause:** When calendar events are built from the mock appointments store, the `id` field assigned to each FullCalendar event does not match the `id` field that the appointment detail page (`/appointments/:id`) uses to look up the record. This produces a valid-looking navigation but resolves to the wrong patient.  
**Fix:**
```js
// When building FC events from mock store, ensure:
const fcEvent = {
  id: appt.id,           // Must be the SAME id used in /appointments/:id route
  title: appt.patient_name,
  start: appt.start_time,
  end: appt.end_time,
  extendedProps: {
    status: appt.status,
    clinicianId: appt.clinician_id,
    clinicId: appt.clinic_id,
    patient: appt.patient_name,
    clinician: appt.clinician_name,
    service: appt.service_name,
    room: appt.room_name,
  },
};

// In the popover "View Details" onClick:
navigate(`/appointments/${event.id}`);  // NOT event.extendedProps.id or any other field
```
**Priority:** 🟡 High — wrong patient shown on detail page breaks clinical workflows  
**Effort:** Low (30 min audit of ID mapping)

---

### SUG-CAL-003 — Fix: Mobile View Switcher Completely Hidden — Add Select Fallback
**Triggered by:** TC-CAL-016 (BUG-CAL-003)  
**File:** `src/pages/calendar/index.jsx` — premium header PROMPT 2  
**Root Cause:** The current implementation uses `display: { xs: 'none', sm: 'flex' }` on the `ToggleButtonGroup`, making view switching impossible on mobile. The `calendar_ui_plan.md` PROMPT 2 did not specify a mobile fallback for the view toggler.  
**Fix:**
```jsx
{/* Mobile-only view Select */}
<Select
  value={currentView}
  onChange={(e) => calendarRef.current?.getApi().changeView(e.target.value)}
  size="small"
  sx={{
    display: { xs: 'flex', sm: 'none' },
    borderRadius: '10px',
    fontSize: '0.78rem', fontWeight: 700,
    bgcolor: '#F1F3F4',
    '& fieldset': { border: 'none' },
  }}
>
  <MenuItem value="dayGridMonth">Month</MenuItem>
  <MenuItem value="timeGridWeek">Week</MenuItem>
  <MenuItem value="timeGridDay">Day</MenuItem>
  <MenuItem value="listWeek">List</MenuItem>
</Select>

{/* Desktop-only ToggleButtonGroup — keep existing */}
<ToggleButtonGroup sx={{ display: { xs: 'none', sm: 'flex' }, ... }}>
  ...
</ToggleButtonGroup>
```
**Priority:** 🟡 High — mobile users cannot change views at all  
**Effort:** Low (20 min)

---

## 🟡 Missing Features

### SUG-CAL-004 — Add "Appointment Type" Filter (In-Person / Video / Home Visit)
**Triggered by:** TC-CAL-010 (BUG-CAL-004)  
**File:** `src/pages/calendar/index.jsx` — filter row PROMPT 3  
**Observation:** The test plan specifies an appointment type filter but no such filter exists in the current UI. This is a real clinical workflow need — receptionists often need to view only telehealth appointments, for example.  
**Suggestion:**
```jsx
// Add to filter row:
const [filterType, setFilterType] = useState('');
const TYPE_OPTIONS = ['', 'in_person', 'video', 'home_visit'];
const TYPE_LABELS = {
  '': 'All Types', in_person: 'In-Person', video: 'Video', home_visit: 'Home Visit'
};

<TextField
  select size="small" value={filterType}
  onChange={(e) => setFilterType(e.target.value)}
  sx={{ minWidth: 135, '& .MuiOutlinedInput-root': { borderRadius: '20px', ... } }}
  InputProps={{
    startAdornment: <InputAdornment position="start">
      <VideocamRoundedIcon sx={{ fontSize: '0.95rem', ... }} />
    </InputAdornment>
  }}
>
  {TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>)}
</TextField>
```
Add `filterType` to the `filteredEvents` `useMemo` above.  
**Priority:** 🟡 Medium  
**Effort:** Low (30 min — follows the same pattern as existing filter chips)

---

## 🟢 UX Improvements

### SUG-CAL-005 — Add "Today's Schedule" Mini-Sidebar or Drawer
**Triggered by:** TC-CAL-001 (observation during month view)  
**Observation:** When in month view, there is no at-a-glance summary of what's happening today. The `calendar_ui_plan.md` item 7 mentions a "Mini stats row" (count chips) but contextual today's appointments aren't shown.  
**Suggestion:**
- Add a collapsible right panel (or bottom sheet on mobile) titled "Today — March 16"
- Shows a compact list of today's appointments sorted by time: `[9:00 AM] Alice T. — Dr. Mitchell — GP Consult`
- Clicking any row navigates to the detail page
- Collapses to a small \"Today (N)\" badge button when hidden
- Integrate with event tooltip logic already in EventTooltip component

**Priority:** 🟢 Low  
**Effort:** Medium

---

### SUG-CAL-006 — Click Empty Cell in Month View to Pre-fill New Booking
**Triggered by:** TC-CAL-001, TC-CAL-012 (calendar interaction observation)  
**Observation:** The `calendar_ui_plan.md` PROMPT 5 adds `cursor: pointer` and `:hover` tint on empty day cells, but clicking an empty cell does nothing. The intent was likely a `+ add` indicator on hover per item 6 of redesign goals.  
**Suggestion:**
- Implement `dateClick` callback in `CalendarView.jsx`:
```jsx
dateClick={(info) => {
  navigate('/appointments/new', { state: { prefillDate: info.dateStr } });
}}
```
- On the booking wizard Step 3 (date/time picker), pre-select the `prefillDate` from location state
- Show a `+` icon on day cell hover in month view (via `dayCellContent` render)

**Priority:** 🟢 Low  
**Effort:** Low (30 min) — QoL feature, design intent is already in the UI plan

---

### SUG-CAL-007 — Status Legend Strip Below Filter Bar
**Triggered by:** `calendar_ui_plan.md` item 5 (not yet implemented)  
**Observation:** The redesign plan item 5 mentions "Status legend strip — small colored dot + label row showing all 5 appointment statuses inline below the filter bar". This was listed as a redesign goal but not addressed in the 8 prompts.  
**Suggestion:**
```jsx
{/* Status Legend Row */}
<Box sx={{ display: 'flex', gap: 2, mb: 1, px: 0.5 }}>
  {[
    { label: 'Confirmed', color: '#0F9D58' },
    { label: 'Pending',   color: '#F9AB00' },
    { label: 'Cancelled', color: '#D93025' },
    { label: 'Completed', color: '#1A73E8' },
    { label: 'No Show',   color: '#80868B' },
  ].map(({ label, color }) => (
    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" sx={{ color: '#5F6368', fontSize: '0.72rem', fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  ))}
</Box>
```
**Priority:** 🟢 Low  
**Effort:** Very Low (5 min — literally copy-paste from the UI plan color reference)

---

### SUG-CAL-008 — Loading Skeleton for Calendar
**Triggered by:** TC-CAL-014 (occasional blank screen before mock data loads)  
**Observation:** The `calendar_ui_plan.md` item 8 planned a skeleton loading state using `@mui/material/Skeleton`, but the current implementation still shows a `CircularProgress` spinner. During appointment detail navigation there's a 2–3 second blank before mock data appears.  
**Suggestion:**
```jsx
// In CalendarPage.jsx, replace CircularProgress with:
{loading ? (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2, mb: 2 }} /> {/* toolbar */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={90} sx={{ borderRadius: 1.5 }} />
      ))}
    </Box>
  </Box>
) : (
  <CalendarView ... />
)}
```
**Priority:** 🟢 Low  
**Effort:** Low — referenced in `calendar_ui_plan.md` as item 8 but not yet implemented

---

### SUG-CAL-009 — Event Pill: Show Clinician Avatar/Initials in Week/Day Views
**Triggered by:** TC-CAL-003 (day view observation)  
**Observation:** `EventContent` currently shows patient name + service + clinician (day only). Adding a small avatar circle makes it easier to visually distinguish appointments by clinician at a glance in the time grid.  
**Suggestion:**
- In `EventContent`, in `timeGridDay` or `timeGridWeek` view, add a `<Avatar sx={{ width: 16, height: 16, fontSize: '0.5rem' }}>` with initials derived from `extendedProps.clinician`
- Use the same color as the event background but at 80% opacity for the avatar background
- Fall back gracefully if `extendedProps.clinician` is undefined

**Priority:** 🟢 Low  
**Effort:** Very Low (15 min)

---

### SUG-CAL-010 — "New Booking" FAB for Mobile
**Triggered by:** TC-CAL-016 (mobile responsiveness)  
**Observation:** The "New Booking" button in the header uses `display: { xs: 'none', sm: 'flex' }` — it's completely hidden on mobile. Users on mobile have no way to create a new appointment from the calendar page.  
**Suggestion:**
```jsx
// Add a floating action button just for mobile:
<Fab
  color="primary"
  aria-label="new booking"
  onClick={() => navigate('/appointments/new')}
  sx={{
    display: { xs: 'flex', sm: 'none' },
    position: 'fixed',
    bottom: 24,
    right: 24,
    background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
    boxShadow: '0 4px 14px rgba(26,115,232,0.40)',
    zIndex: 1200,
  }}
>
  <AddRoundedIcon />
</Fab>
```
**Priority:** 🟡 Medium  
**Effort:** Very Low (10 min)

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-CAL-001 | Fix status filter — `filteredEvents` useMemo not applied to FC | 🐛 Bug Fix | 🔴 Critical | Very Low |
| SUG-CAL-002 | Fix appointment ID mismatch on calendar→detail navigation | 🐛 Bug Fix | 🟡 High | Low |
| SUG-CAL-003 | Mobile view switcher: add `<Select>` fallback for xs screens | 🐛 Bug Fix | 🟡 High | Low |
| SUG-CAL-004 | Add "Appointment Type" filter (In-Person / Video / Home Visit) | 🚀 Feature | 🟡 Medium | Low |
| SUG-CAL-005 | Today's Schedule mini-sidebar or collapsible drawer | 🚀 Feature | 🟢 Low | Medium |
| SUG-CAL-006 | Click empty cell → pre-fill New Booking with date | ✨ UX | 🟢 Low | Low |
| SUG-CAL-007 | Status legend strip below filter bar (from UI plan item 5) | ✨ UX | 🟢 Low | Very Low |
| SUG-CAL-008 | Replace CircularProgress with FullCalendar skeleton (UI plan item 8) | ✨ UX | 🟢 Low | Low |
| SUG-CAL-009 | Clinician avatar/initials badge on event pill in week/day view | ✨ UX | 🟢 Low | Very Low |
| SUG-CAL-010 | Mobile FAB for "New Booking" (hidden on xs in current design) | ✨ UX | 🟡 Medium | Very Low |

---

## Quick Wins (Low Effort, High Impact)

1. **SUG-CAL-001** — Fix status filter (one `useMemo` + case-insensitive compare = ~15 min fix, eliminates most-reported calendar bug)
2. **SUG-CAL-007** — Status legend strip (5 lines of JSX from the UI plan color reference)
3. **SUG-CAL-010** — Mobile "New Booking" FAB (import `Fab`, add 15 lines — restores core mobile action)
4. **SUG-CAL-003** — Mobile view switcher `<Select>` (20 min, restores mobile navigation entirely)

---

## UI Plan Gaps (Planned but Not Yet Implemented)

These were listed as goals in `calendar_ui_plan.md` but not covered by the 8 PROMPTS:

| Item | Status | Suggestion |
|------|--------|-----------|
| Item 5 — Status legend strip | ❌ Not implemented | → SUG-CAL-007 above |
| Item 6 — `+` add indicator on date cell hover | ❌ Not implemented | → SUG-CAL-006 (dateClick + dayCellContent) |
| Item 8 — Loading skeleton | ❌ Not implemented | → SUG-CAL-008 above |
