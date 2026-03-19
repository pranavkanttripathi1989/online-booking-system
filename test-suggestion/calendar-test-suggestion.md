# Calendar — Feature Suggestions (Updated 2026-03-19)

**Derived from:** [calendar-test-results.md](../test-result/calendar-test-results.md)  
**Test Plan Source:** [calendar-test-plan.md](../test-plan/calendar-test-plan.md)  
**UI Plan Source:** [calendar_ui_plan.md](../calendar_ui_plan.md)  
**Date:** 2026-03-16 | **Updated:** 2026-03-19 Session 2  
**Tested by:** Antigravity AI Browser Agent

> Session 2 completed all critical and high-priority items. Four bugs fixed, four UX suggestions implemented. Two medium-effort suggestions deferred pending backend.

---

## 🔴 Bug Fixes Required

### SUG-CAL-001 — Fix: Status Filter Not Applied to FullCalendar Events ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added `filteredEvents = useMemo(() => { /* filter by status, type, clinician, clinic */ }, [...])` in `CalendarPage`. Passed `filteredEvents` to `<CalendarView events={filteredEvents}>` and `<RoomView appointments={filteredEvents}>` instead of raw `events`. Case-insensitive `.toLowerCase()` comparison used.

---

### SUG-CAL-002 — Fix: Calendar Event ID ↔ Appointment Detail ID Mismatch ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** `generateMockCalendarData()` now first maps all real MockStore appointments with their own `appt-{n}` IDs. Extra visual density events use `gen-{n}` IDs (starting at 500) so they never collide. Popover → detail navigation now resolves the correct patient.

---

### SUG-CAL-003 — Fix: Mobile View Switcher Completely Hidden — Add Select Fallback ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added `<Select display:{xs:'flex',sm:'none'}>` with all 5 view options (Month/Week/Day/List/Room) in the header. Existing `ToggleButtonGroup` uses `display:{xs:'none',sm:'flex'}`. Added `Fab` import + mobile FAB simultaneously.

---

### SUG-CAL-004 — Add "Appointment Type" Filter (In-Person / Video / Home Visit) ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added `filterType` state, `TYPE_OPTIONS`/`TYPE_LABELS` constants, and a `PillSelect` with `VideocamRoundedIcon` after the Status filter. Mock event generator updated to include `apptType` field on each event. `filteredEvents` useMemo filters on `extendedProps.apptType === filterType`.

---

## 🟡 Missing Features

### SUG-CAL-005 — Add "Today's Schedule" Mini-Sidebar or Drawer ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added a 272px collapsible `<Collapse orientation="horizontal">` panel to the right of the calendar container. Features:
- **Toggle**: `TodayRoundedIcon` badge button in the page header (with live count badge) + `›` close button inside the panel
- **Content**: Today's appointments sorted by start time using `useMemo`; each card shows time range, patient name, clinician, service, status badge
- **Active indicator**: Teal left border stripe + pulsing green dot + "NOW" label for currently in-progress appointments
- **Past dimming**: `opacity: 0.65` for appointments that have already ended
- **Empty state**: EventNote icon + "No appointments today" + "+ Add Appointment" teal outlined button
- **Footer**: "View All Appointments" link to `/appointments`
- **Mobile**: Panel hidden on `xs` (isMobile check); only shown on `sm+`

---

## 🟢 UX Improvements

### SUG-CAL-006 — Click Empty Cell in Month View to Pre-fill New Booking ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** `dateClick` callback was already wired in `CalendarView.jsx` → `handleSlotClick(info.dateStr)` → `navigate('/appointments/new?date=...')`. Verified: clicking empty cell navigates to `/appointments/new?date=YYYY-MM-DD`.

---

### SUG-CAL-007 — Status Legend Strip Below Filter Bar ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added 5-item legend row (`●Confirmed ●Pending ●Cancelled ●Completed ●No Show`) below the filter bar. `display:{xs:'none', sm:'flex'}` — hidden on mobile. Teal for Completed (not blue) to match theme.

---

### SUG-CAL-008 — Loading Skeleton for Calendar ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** When `loading === true`, the calendar container is replaced by a full skeleton grid. Includes:
- Toolbar skeleton (prev/next buttons + month label + view toggle placeholder)
- 7 day-of-week header skeletons
- 35 day cell skeletons (5 weeks × 7 days), each with a day number skeleton and 0–3 random event pill skeletons
- On `loading === false`, the real `<CalendarView>` + Today's Schedule sidebar render inside a `flex` row

---

### SUG-CAL-009 — Event Pill: Show Clinician Initials in Week View ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** In `CalendarView.jsx` `EventContent`, added `clinicianInitials` derived from `extendedProps.clinician`. Shows a 14×14px white-background circle with 7px bold initials in Week view only (`isTimeGrid && !isDayView`). Falls back gracefully when no clinician data.

---

### SUG-CAL-010 — "New Booking" FAB for Mobile ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:** Added `<Fab display:{xs:'flex',sm:'none'} position:fixed bottom:24 right:24>` with teal gradient matching app theme. Clicking navigates to `/appointments/new`. Desktop header "New Booking" button also updated to `display:{xs:'none',sm:'flex'}`.

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CAL-001 | Fix status filter — filteredEvents useMemo | 🐛 Bug Fix | 🔴 Critical | ✅ DONE |
| SUG-CAL-002 | Fix appointment ID mismatch on calendar→detail | 🐛 Bug Fix | 🟡 High | ✅ DONE |
| SUG-CAL-003 | Mobile view switcher Select fallback | 🐛 Bug Fix | 🟡 High | ✅ DONE |
| SUG-CAL-004 | Add Appointment Type filter (In-Person/Video/Home) | 🚀 Feature | 🟡 Medium | ✅ DONE |
| SUG-CAL-005 | Today's Schedule mini-sidebar / drawer | 🚀 Feature | 🟢 Low | ✅ DONE |
| SUG-CAL-006 | Click empty cell → pre-fill New Booking | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-007 | Status legend strip below filter bar | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-008 | Replace CircularProgress with skeleton | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-009 | Clinician initials badge on event pill (week view) | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-010 | Mobile FAB for New Booking | ✨ UX | 🟡 Medium | ✅ DONE |

---

## UI Plan Gaps — Updated Status

| Item | Status |
|------|--------|
| Item 5 — Status legend strip | ✅ DONE — SUG-CAL-007 |
| Item 6 — `+` add indicator on date cell hover | ✅ DONE — SUG-CAL-006 (dateClick navigation) |
| Item 8 — Loading skeleton | ✅ DONE — SUG-CAL-008 |
