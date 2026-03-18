# Appointments — Test Plan (Updated Post-Implementation)

**Feature area:** `/src/pages/appointments/`  
**Files:** `index.jsx`, `create.jsx`, `edit.jsx`, `detail.jsx`  
**Routes tested:** `/appointments`, `/appointments/new`, `/appointments/:id`, `/appointments/:id/edit`  
**GraphQL:** `APPOINTMENTS_QUERY`, `CANCEL_APPOINTMENT_MUTATION`  
**Mock data:** `src/mocks/store.js` (35 records)  
**Updated:** 2026-03-18 — Added TC-APPT-020/021/022/023 for implemented suggestions; updated TC-APPT-001 to reflect tab strip.

---

## 1. Appointments List Page (`/appointments`)

### TC-APPT-001 — List loads with Upcoming / Past / All tabs and mock data
**Prompt:**
> Navigate to `http://localhost:3001/appointments`.
> Assert: 3-tab strip visible: "Upcoming", "Past", "All".
> Assert: "Upcoming" is selected by default (blue underline indicator).
> Assert: Subtitle reads "X upcoming appointments" (not "35 total").
> Assert: "Export CSV" button visible in header next to "+ New Booking".
> Assert: Filter toolbar below tabs: Patient name, Status, Clinician, From, To date pickers, red Clear icon.
> Assert: Status chips visible: Confirmed (green), Pending (amber), Cancelled (red), Completed (blue), No Show (grey).

**Expected:** Page loads in "Upcoming" mode. 12 upcoming appointments shown (≤35). No blank screen.

---

### TC-APPT-002 — Search by patient name
**Prompt:**
> On `/appointments`, type "Alice" in the Patient name field. Press Enter or blur.
> Assert: table updates to show only rows with "Alice" in the patient name column.

**Expected:** 300ms debounce (blur/Enter). Matching rows shown. Non-matching hidden.

---

### TC-APPT-003 — Filter by status — Confirmed only
**Prompt:**
> On `/appointments`, open the Status dropdown. Select "Confirmed".
> Assert: only rows with green "Confirmed" chip are shown. Other statuses disappear.
> Assert: subtitle count updates.

**Expected:** `STATUS_OPTIONS` filter applied. Table re-renders with filtered rows.

---

### TC-APPT-004 — Filter by date range
**Prompt:**
> On `/appointments`, set From date to 2026-03-16 and To date to 2026-03-23.
> Assert: only appointments within that date range shown.

**Expected:** DatePicker values applied. Records outside range excluded.

---

### TC-APPT-005 — Clear all filters resets table
**Prompt:**
> Apply status "Cancelled" and search "bob". Click the red `FilterAltOffIcon` button.
> Assert: search field clears, status resets to "All Statuses", tab returns to "Upcoming", date pickers cleared.
> Assert: all upcoming appointments return.

**Expected:** All state reset. Tab returns to "Upcoming". Subtitle says "X upcoming appointments".

---

### TC-APPT-006 — Click row navigates to detail page
**Prompt:**
> On `/appointments`, click the eye (View) icon on any row.
> Assert: navigated to `/appointments/:id`. Detail page renders with appointment info.

**Expected:** `navigate('/appointments/${id}')` fires. Detail page loads with all cards populated.

---

### TC-APPT-007 — New appointment button navigates to create
**Prompt:**
> On `/appointments`, click the "+ New Booking" button in the page header.
> Assert: navigated to `/appointments/new` (or booking wizard).
> Also: verify FAB (bottom-right) navigates to the same route.

**Expected:** Button and FAB both navigate to `/appointments/new`. 5-step wizard loads.

---

### TC-APPT-008 — Cancel dialog opens
**Prompt:**
> On `/appointments` (switch to "All" or "Upcoming" tab), find a row with status "Confirmed" or "Pending".
> Click the red Cancel (X) icon in the Actions column.
> Assert: dialog opens with title "Cancel Appointment" and ❌ icon.
> Assert: dialog body includes warning text and "Cancellation reason (optional)" textarea with autoFocus.
> Assert: two buttons: "Keep Appointment" (outlined) and "Cancel Appointment" (red filled).

**Expected:** `CancelDialog` opens. No mutation called yet. Textarea has autoFocus.

---

### TC-APPT-009 — Confirm cancel → optimistic update
**Prompt:**
> Open cancel dialog for a "Confirmed" appointment. Type "Patient requested cancellation" in reason.
> Click "Cancel Appointment" (red confirm button).
> Assert: dialog closes immediately.
> Assert: row status chip changes to "Cancelled" (red) **immediately, before mutation response**.
> Assert: warning snackbar appears: "Appointment cancelled."

**Expected:** Optimistic update via `setOptimisticCancelled(Set)`. Row reflects cancel instantly. Mutation fires in background.

---

### TC-APPT-020 — Upcoming / Past / All tabs (new)
**Prompt:**
> On `/appointments`, verify "Upcoming" starts as default.
> Click "Past" tab. Assert: table shows only past appointments (< today). Subtitle reads "X past appointments".
> Click "All" tab. Assert: table shows all 35 appointments. Subtitle reads "35 total appointments".
> Switch back to "Upcoming". Assert: returns to 12 upcoming.
> Apply a date filter while on "Upcoming". Assert: explicit date filter overrides the tab's implicit bound.

**Expected:** Tab state controls implicit date range. Explicit date filters layer on top. Subtitle reflects active tab.

---

### TC-APPT-021 — Export CSV button
**Prompt:**
> On "All" tab (35 appointments), click "Export CSV" in the header.
> Assert: file downloads as `appointments_all_YYYY-MM-DD.csv`.
> Assert: green snackbar "Exported 35 appointments as CSV".
> Switch to "Upcoming" tab (12 appointments), click Export CSV again.
> Assert: snackbar says "Exported 12 appointments as CSV". Filename: `appointments_upcoming_....csv`.

**Expected:** Export respects active tab's filter state. Filename includes tab name and date.

---

### TC-APPT-022 — Contextual empty state when filters return 0 results
**Prompt:**
> On `/appointments`, search for "xyznonexistent" in patient name and press Enter.
> Assert: DataGrid empty state shows:
>   - CalendarMonthIcon
>   - "No appointments match your filters" (heading)
>   - "Try widening your date range, clearing the status filter, or searching a different name." (body)
>   - Red "Clear all filters" button
> Click "Clear all filters". Assert: search cleared, table restored.

**Expected:** `EmptyState({ hasFilters: true, onClearFilters })` renders contextual message. Generic state "No appointments yet" does NOT appear.

---

## 2. Appointment Detail Page (`/appointments/:id`)

### TC-APPT-010 — Detail page loads for a real appointment ID
**Prompt:**
> Navigate to `http://localhost:3001/appointments/appt-1`.
> Assert: patient name, clinician, service, date/time, status, clinic location visible.
> Assert: 4 action buttons in right column: "Mark as Completed", "Mark No Show", "Cancel Appointment", "Send Reminder".
> Assert: Pre-visit Checklist card visible.

**Expected:** All detail cards populated. Actions panel shows 4 buttons (not terminal status).

---

### TC-APPT-011 — Detail page loads for mock ID (mock-50)
**Prompt:**
> Navigate to `/appointments/mock-50`.
> Assert: page does NOT show 404 or blank. Appointment detail renders.

**Expected:** `parseInt('50') % 35 = 15` → maps to valid record.

---

### TC-APPT-012 — Invalid appointment ID shows not-found state
**Prompt:**
> Navigate to `/appointments/nonexistent-xyz`.
> Assert: "Appointment not found" + CalendarMonthIcon + "← Back" button. No React crash.

**Expected:** Graceful empty state. Back button navigates to `/appointments`.

---

### TC-APPT-013 — Edit button on detail navigates to edit
**Prompt:**
> On `/appointments/appt-1`, click "Edit" button in header.
> Assert: navigated to `/appointments/appt-1/edit`. Form pre-filled.

**Expected:** Edit page loads with all existing values pre-populated.

---

### TC-APPT-023 — Send Reminder button on detail (new)
**Prompt:**
> Navigate to `/appointments/appt-3` (or any non-terminal appointment).
> Assert: "Send Reminder" button is visible in the Actions panel (teal outline, bell icon).
> Click "Send Reminder".
> Assert: button shows "Sending…" (disabled) for ~1.5s.
> Assert: green snackbar: "Reminder sent to [patient email]".
> Assert: button re-enables after sending.

**Expected:** `handleSendReminder()` fires, setTimeout 1500ms, snackbar shows patient contact info.

---

## 3. Create Appointment (`/appointments/new`)

### TC-APPT-014 — Create form validates required fields
**Prompt:**
> Navigate to `/appointments/new`. Try to proceed without filling required fields.
> Assert: "Review Booking" button stays disabled. Required fields highlighted.

**Expected:** Validation prevents progression. Required fields: First Name, Last Name minimum.

---

### TC-APPT-015 — 5-step booking wizard works end-to-end
**Prompt:**
> Open booking wizard via Dashboard or `/appointments/new`.
> Walk: Step 1 (Clinic) → Step 2 (Clinician + Service) → Step 3 (Date/Time calendar + slot grid) → Step 4 (Patient details) → Step 5 (Confirm).
> Assert: all 5 steps render. Clinic cards selectable. Time slots selectable.

**Expected:** Full wizard navigation. Step 4 has "Existing Patient" / "New Patient" toggle.

---

### TC-APPT-016 — Wizard back navigation preserves data
**Prompt:**
> On Step 4 of booking wizard, click "Back".
> Assert: returns to Step 3 with previously selected date and time slot still highlighted.

**Expected:** Stepper preserves state. Back does NOT reset data.

---

## 4. Edit Appointment (`/appointments/:id/edit`)

### TC-APPT-017 — Edit form pre-fills with existing data
**Prompt:**
> Navigate to `/appointments/appt-1/edit`.
> Assert: Status dropdown, Clinician, Start datetime, End datetime all pre-filled with existing values.

**Expected:** All form fields pre-populated from fetched (or mock) appointment data.

---

### TC-APPT-018 — Edit and save appointment
**Prompt:**
> On edit page, change Status to "Completed". Click "Save Changes".
> Assert: mutation fires (network error expected in mock mode — no crash).

**Expected:** `UPDATE_APPOINTMENT_MUTATION` fires correctly. PASS* in mock mode (requires backend for full verify).

---

### TC-APPT-019 — Reschedule changes date and time
**Prompt:**
> On edit page, change Start and End date/time to new values. Click Save.
> Assert: form captures new values. Mutation fires.

**Expected:** Date fields update, mutation triggered. PASS* in mock mode.
