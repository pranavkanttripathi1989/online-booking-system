# Calendar — Test Plan

**Feature area:** `/src/pages/calendar/index.jsx`, `/src/components/Calendar/`  
**Routes tested:** `/calendar`  
**Libraries:** dayjs, custom calendar grid  
**Mock data:** `src/mocks/store.js` appointments  
**Key features:** Month/Week/Day/Room views, filters (clinician, status, type), event popover, navigate to appointment detail

---

## 1. View Switching

### TC-CAL-001 — Default view is Month
**Prompt:**  
> Navigate to `http://localhost:3001/calendar`.  
> Assert: calendar renders in month view. Current month name and year shown in header. 7-column grid with day numbers visible.

**Expected:** Default `view = 'month'`. 30/31 day cells rendered. Today's date highlighted.

---

### TC-CAL-002 — Switch to Week view
**Prompt:**  
> On `/calendar`, click the "Week" view button.  
> Assert: calendar shows 7 columns, one per day of the current week. Appointment blocks shown in time slots.

**Expected:** View changes to `week`. Date header shows Mon–Sun of current week.

---

### TC-CAL-003 — Switch to Day view
**Prompt:**  
> On `/calendar`, click the "Day" view button.  
> Assert: single-day view with hour time slots (00:00 – 23:00). Appointments shown as blocks within respective time slots.

**Expected:** View changes to `day`. 24-hour or work-hours grid shows.

---

### TC-CAL-004 — Switch to Room view
**Prompt:**  
> On `/calendar`, click the "Room" view button.  
> Assert: columns represent rooms/clinics. Appointments shown under their assigned room. Room names visible in column headers.

**Expected:** Room view grid renders. Appointments grouped by room assignment.

---

## 2. Navigation (Prev/Next/Today)

### TC-CAL-005 — Navigate to previous month
**Prompt:**  
> On month view, click the "<" (previous) arrow button in the calendar header.  
> Assert: calendar shows the previous month. Month name in header updates (e.g., March → February).

**Expected:** `currentDate` state decremented by 1 month using dayjs.

---

### TC-CAL-006 — Navigate to next month
**Prompt:**  
> Click the ">" (next) arrow. Assert: calendar advances to next month.

**Expected:** `currentDate` incremented. Grid re-renders with next month's days.

---

### TC-CAL-007 — Today button snaps to current date
**Prompt:**  
> Navigate to any past or future month. Click "Today" button.  
> Assert: calendar returns to current month/week/day. Today's cell is highlighted.

**Expected:** `currentDate` reset to `dayjs()`. Today indicator shows.

---

## 3. Filtering

### TC-CAL-008 — Filter by clinician
**Prompt:**  
> On `/calendar`, open the Clinician filter dropdown. Select "Dr. Sarah Mitchell".  
> Assert: only appointments assigned to Dr. Sarah Mitchell are shown on the calendar. Other doctors' appointments disappear.

**Expected:** `selectedClinician` filter applied. Appointments re-filtered.

---

### TC-CAL-009 — Filter by status — Confirmed
**Prompt:**  
> Open the Status filter. Select "Confirmed".  
> Assert: only confirmed (green) appointments shown. Pending, Cancelled cleared.

**Expected:** Status filter applied correctly across all views.

---

### TC-CAL-010 — Filter by appointment type
**Prompt:**  
> Open the Type filter. Select "In-Person".  
> Assert: only in-person appointments shown. Video/telehealth entries disappear.

**Expected:** Type filter applied. Calendar re-renders.

---

### TC-CAL-011 — Clear filters shows all appointments
**Prompt:**  
> Apply clinician + status filters. Click "Clear Filters" or reset button.  
> Assert: all appointments return. Filter dropdowns reset to "All".

**Expected:** All filter states reset to defaults. Full appointment list shown.

---

## 4. Appointment Interaction

### TC-CAL-012 — Click event opens detail popover
**Prompt:**  
> On the calendar, click on any appointment block (colored event).  
> Assert: a popover/modal appears with patient name, clinician, time, service type, status chip.

**Expected:** `Popover` opens with appointment summary. Styled with teal theme.

---

### TC-CAL-013 — Popover "View Details" navigates to detail page
**Prompt:**  
> Click an appointment block → popover opens → click "View Details" button.  
> Assert: navigated to `/appointments/{id}` or `/appointments/mock-{n}`. Detail page renders.

**Expected:** `navigate('/appointments/' + event.id)` fires. Mock ID fallback works for mock events.

---

### TC-CAL-014 — Mock appointment links work (mock-50)
**Prompt:**  
> Navigate to `http://localhost:3001/appointments/mock-50`.  
> Assert: appointment detail page renders with patient and clinician data. No 404 or blank page.

**Expected:** Mock ID `50 % mockList.length` maps to a valid appointment. Detail renders.

---

### TC-CAL-015 — Events display correct colors per status
**Prompt:**  
> On the monthly calendar, observe appointment blocks.  
> Assert: Confirmed = green, Pending = yellow/orange, Cancelled = red, Completed = blue teal.

**Expected:** Color coding matches STATUS_CFG in the calendar component.

---

## 5. Responsive Behavior

### TC-CAL-016 — Mobile: view switcher collapses to dropdown
**Prompt:**  
> Resize browser to 375px width. Navigate to `/calendar`.  
> Assert: Month/Week/Day/Room buttons may collapse into a select/dropdown for mobile. Calendar still renders.

**Expected:** Responsive layout — no horizontal overflow. Calendar accessible on mobile.
