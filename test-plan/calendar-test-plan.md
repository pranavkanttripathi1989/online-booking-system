# Calendar — Test Plan (Updated Post-Implementation)

**Feature area:** `/src/pages/calendar/index.jsx`, `/src/components/Calendar/`  
**Routes tested:** `/calendar`  
**Libraries:** dayjs, FullCalendar (dayGrid, timeGrid, interaction, list)  
**Mock data:** `src/mocks/store.js` + `generateMockCalendarData()`  
**Key features:** Month/Week/Day/List/Room views, filters (clinician, clinic, status, type), event popover, navigate to appointment detail, mobile FAB, status legend strip  
**Updated:** 2026-03-16 — Original 16 TCs.  
**Updated:** 2026-03-19 Session 2 — Fixed TC-009/010/013/016, added TC-017 to TC-020. **Total: 20 TCs.**

---

## 1. View Switching

### TC-CAL-001 — Default view is Month
**Prompt:**  
> Navigate to `http://localhost:3002/calendar`.  
> Assert: calendar renders in month view. Current month name and year shown in header. 7-column grid with day numbers visible. Status legend strip (`●Confirmed ●Pending ●Cancelled ●Completed ●No Show`) visible below the filter bar.

**Expected:** Default `view = 'dayGridMonth'`. 30/31 day cells rendered. Today's date highlighted. Legend strip visible.

---

### TC-CAL-002 — Switch to Week view
**Prompt:**  
> On `/calendar`, click the "Week" view button.  
> Assert: calendar shows 7 columns, one per day of the current week. Appointment blocks shown in time slots.  
> Assert: event pills in Week view show a small circular clinician initials badge.

**Expected:** View changes to `timeGridWeek`. Clinician initials (SUG-CAL-009) visible on event pills.

---

### TC-CAL-003 — Switch to Day view
**Prompt:**  
> On `/calendar`, click the "Day" view button.  
> Assert: single-day view with hour time slots. Appointments show patient name + service + clinician name.

**Expected:** View changes to `timeGridDay`. Full clinician name shown on event.

---

### TC-CAL-004 — Switch to Room view
**Prompt:**  
> On `/calendar`, click the "Room" view button.  
> Assert: columns represent rooms/clinics. Room names in headers. Appointments grouped under their assigned room.

**Expected:** Custom `RoomView` renders. Appointments grouped by room.

---

## 2. Navigation (Prev/Next/Today)

### TC-CAL-005 — Navigate to previous month
**Prompt:**  
> On month view, click the "‹" (previous) arrow button in the calendar toolbar.  
> Assert: calendar shows the previous month.

**Expected:** `dayjs` `subtract(1, 'month')` applied. Grid re-renders.

---

### TC-CAL-006 — Navigate to next month
**Prompt:**  
> Click the "›" (next) arrow. Assert: calendar advances to next month.

**Expected:** `add(1, 'month')`. Grid re-renders.

---

### TC-CAL-007 — Today button snaps to current date
**Prompt:**  
> Navigate to any past or future month. Click "Today" button.  
> Assert: calendar returns to current month/week/day. Today's cell is highlighted (teal circle badge on day number).

**Expected:** `currentDate` reset to `dayjs()`. Today indicator shows.

---

## 3. Filtering

### TC-CAL-008 — Filter by clinician
**Prompt:**  
> Open the "All Clinicians" dropdown. Select any clinician.  
> Assert: only appointments for that clinician are visible. Status count chips on right update to reflect filtered totals.  
> Click "Clear" chip. Assert: all appointments return.

**Expected:** `filterClinician` applied via `filteredEvents` useMemo. Clear chip resets state.

---

### TC-CAL-009 — Filter by status — Pending (BUG-CAL-001 Fixed)
**Prompt:**  
> Open the Status filter (with colored dot). Select "Pending".  
> Assert: ONLY orange/yellow pending appointments remain visible. All green (confirmed) events disappear.  
> Assert: status count chips show only Pending count.  
> Click "Clear". Assert: all events restored.

**Expected:** `filteredEvents` useMemo filters on `extendedProps.status.toLowerCase() === 'pending'`. Passed to `<CalendarView>`. Not raw events.

---

### TC-CAL-010 — Filter by appointment type (BUG-CAL-004 Fixed — feature added)
**Prompt:**  
> Open the "All Types" filter pill (4th filter, with video icon).  
> Select "Video".  
> Assert: only telehealth/video appointments shown. Other types disappear.  
> Select "In-Person" — only in-person shown. "Home Visit" — only home visits.

**Expected:** `filterType` state applied on `extendedProps.apptType`. Mock data includes `apptType` field per event.

---

### TC-CAL-011 — Clear filters shows all appointments
**Prompt:**  
> Apply clinician + status + type filters. Click "Clear" chip (red, `×`).  
> Assert: all filter dropdowns reset to "All ..." defaults. All appointments return.

**Expected:** `handleClearFilters()` resets all 4 filter states to empty string.

---

## 4. Appointment Interaction

### TC-CAL-012 — Click event opens detail popover
**Prompt:**  
> On the calendar, click on any appointment block.  
> Assert: a popover card appears (centered, glassmorphism) with: patient name + initials avatar, clinician, time range, service, room, status chip (color-coded).  
> Assert: "View Full Details" (teal) and "Edit" (outlined) buttons visible.

**Expected:** `handleEventClick()` sets `popoverEvent` + `popoverAnchor`. Popover rendered with correct appointment data.

---

### TC-CAL-013 — Popover "View Details" navigates to correct patient (BUG-CAL-002 Fixed)
**Prompt:**  
> Click an appointment block (e.g., "Robert Clark" on March 5). Note the patient name in popover.  
> Click "View Full Details". Assert: navigated to `/appointments/appt-{n}`.  
> Assert: the detail page shows the SAME patient as the popover (not a different patient).

**Expected:** `navigate('/appointments/' + popoverEvent.id)`. MockStore events use real IDs (`appt-1`, `appt-2`, …). Detail resolves correctly.

---

### TC-CAL-014 — Mock appointment links work (mock-50)
**Prompt:**  
> Navigate to `http://localhost:3002/appointments/mock-50`.  
> Assert: appointment detail page renders with patient and clinician. No 404 or blank page.

**Expected:** MockStore `parseInt('50') % allMockApts.length` fallback maps to a valid record.

---

### TC-CAL-015 — Events display correct colors per status
**Prompt:**  
> On month view, observe appointment blocks.  
> Assert: Green = Confirmed, Orange/Yellow = Pending, Red = Cancelled, Teal = Completed. Matches status legend strip.

**Expected:** `STATUS_COLORS` map applied as `backgroundColor` and `borderColor` on each event.

---

## 5. Responsive Behavior

### TC-CAL-016 — Mobile: view switcher collapses to dropdown (BUG-CAL-003 Fixed)
**Prompt:**  
> Resize browser to 375px width. Navigate to `/calendar`.  
> Assert: `<Select>` dropdown shows current view (Month/Week/Day/List/Room) — ToggleButtonGroup hidden at xs.  
> Assert: floating teal FAB `+` button visible at bottom-right (mobile only).

**Expected:** `<Select display:{xs:'flex',sm:'none'}>` shown; ToggleButtonGroup `display:{xs:'none',sm:'flex'}` hidden. FAB `display:{xs:'flex',sm:'none'}` at `position:fixed bottom:24 right:24`.

---

## 6. Session 2 Additions (2026-03-19)

### TC-CAL-017 — Status legend strip below filter bar (SUG-CAL-007)
**Prompt:**  
> On `/calendar`, look below the filter bar row.  
> Assert: a row of `●Confirmed ●Pending ●Cancelled ●Completed ●No Show` with colored dots and label text visible.

**Expected:** 5-item legend strip. `display:{xs:'none',sm:'flex'}` (hidden on mobile).

---

### TC-CAL-018 — Click empty date cell → pre-fill New Booking (SUG-CAL-006)
**Prompt:**  
> In Month view, click on an empty day cell (not on an appointment).  
> Assert: URL changes to `/appointments/new?date=YYYY-MM-DD`.

**Expected:** FullCalendar `dateClick` callback → `handleSlotClick(info.dateStr)` → `navigate('/appointments/new?date=...')`.

---

### TC-CAL-019 — Combined type + status filter (AND logic)
**Prompt:**  
> Select Type = "Video" AND Status = "Confirmed".  
> Assert: only confirmed video appointments shown (both predicates active simultaneously).

**Expected:** `filteredEvents` useMemo applies all active filters with AND logic.

---

### TC-CAL-020 — Mobile FAB navigates to new booking (SUG-CAL-010)
**Prompt:**  
> At 375px width, click the teal FAB at bottom-right.  
> Assert: navigates to `/appointments/new`.

**Expected:** `onClick={() => navigate('/appointments/new')}` on FAB. Only visible on `xs`.
