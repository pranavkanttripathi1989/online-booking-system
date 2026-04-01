# Appointments — Test Plan (Updated Post-Implementation)

**Feature area:** `/src/pages/appointments/`  
**Files:** `index.jsx`, `create.jsx`, `edit.jsx`, `detail.jsx`  
**Routes tested:** `/appointments`, `/appointments/new`, `/appointments/:id`, `/appointments/:id/edit`  
**GraphQL:** `APPOINTMENTS_QUERY`, `CANCEL_APPOINTMENT_MUTATION`  
**Mock data:** `src/mocks/store.js` (35 records)  
**Updated:** 2026-03-18 — Added TC-APPT-020/021/022/023 for implemented suggestions; updated TC-APPT-001 to reflect tab strip.  
**Updated:** 2026-03-19 Session 3 — Added TC-APPT-024 to TC-APPT-029 for NEW-APPT-001/002/003, SUG-APPT-005, SUG-APPT-007.  
**Updated:** 2026-03-19 Session 4 — Added TC-APPT-030 to TC-APPT-034 (Print, Status Timeline, Teal Theme, Time Validation, Empty State).  
**Updated:** 2026-03-27 v3 — Added TC-APPT-035 to TC-APPT-038 (Bulk Select, Reminder Channel, Reschedule Dialog, Service Checklist). **Total: 38 TCs.**

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

**Expected:** Full PASS in mock mode — `onError` detects network failure, updates MockStore in-memory, shows success snackbar, navigates to detail page.

---

### TC-APPT-019 — Reschedule changes date and time
**Prompt:**
> On edit page, change Start and End date/time to new values. Click Save.
> Assert: form captures new values, success snackbar, redirect.

**Expected:** Full PASS in mock mode — date fields captured, MockStore updated, success snackbar, redirect to detail.

---

## 5. Session 3 Additions (2026-03-19)

### TC-APPT-024 — Upcoming/Past tab uses current datetime boundary (NEW-APPT-001/003)
**Prompt:**
> On `/appointments`, click "Past" tab.
> Assert: appointments from *earlier today* (before current time) are shown in Past, not stuck in a grey zone.
> Assert: "Upcoming" only shows appointments scheduled *after current time*.

**Expected:** `dayjs()` (current moment) used as boundary — not start/end of day. No appointments fall into a no-man's land.

---

### TC-APPT-025 — CSV export includes Room & Clinic columns (NEW-APPT-002)
**Prompt:**
> On `/appointments` All tab, click "Export CSV".
> Assert: snackbar says "Exported X appointments as CSV (10 columns)".
> Open the CSV: verify columns include Room and Clinic (after Status).

**Expected:** 10-column CSV: ID, Patient, Email, Clinician, Service, Date & Time, Duration, Status, Room, Clinic.

---

### TC-APPT-026 — Inline status change via chip click (SUG-APPT-005)
**Prompt:**
> On `/appointments` list, hover over a "Pending" status chip.
> Assert: tooltip "Click to change status" appears.
> Click the chip. Assert: dropdown menu with status options opens.
> Select "Confirmed". Assert: chip changes immediately to "Confirmed" (green).
> Assert: green snackbar appears: `Status updated to "Confirmed"`.

**Expected:** `handleInlineStatusChange` applies `statusOverrides[rowId]`, updates UI immediately. Mutation fires in background.

---

### TC-APPT-027 — Terminal statuses do not open inline menu (SUG-APPT-005)
**Prompt:**
> Click on a "Cancelled", "Completed", or "No Show" status chip.
> Assert: NO dropdown menu opens. Cursor is `default` (not pointer) on those chips.

**Expected:** Guard condition `['cancelled','completed','no_show'].includes(row.status)` prevents menu from opening.

---

### TC-APPT-028 — Sidebar shows pending appointment count badge (SUG-APPT-007)
**Prompt:**
> Log in. Look at sidebar next to "Appointments" nav item.
> Assert: an amber badge with a number is visible.
> Assert: the number matches the count of pending appointments in the mock data.
> Change a pending appointment to confirmed via inline status. Assert: badge count decreases.

**Expected:** `useMemo(() => MockStore.getAppointments({ status: 'pending' }).length, [])` shown as amber badge. Note: badge only decrements on next render/page reload (memo dep array is empty; real-time update requires state subscription).

---

### TC-APPT-029 — Export CSV with 10 columns on Upcoming tab
**Prompt:**
> Switch to "Upcoming" tab. Click Export CSV.
> Assert: snackbar says "Exported X appointments as CSV (10 columns)".
> Assert: filename is `appointments_upcoming_YYYY-MM-DD.csv`.

**Expected:** Upcoming tab filter applied to export. 10-column CSV with Room + Clinic fields.

---

## 6. Session 4 Additions (2026-03-19 — Theme & Validation)

### TC-APPT-030 — Print appointment detail
**Prompt:**
> Navigate to any appointment detail page. Click the "Print" button in the header.
> Assert: browser print dialog opens.

**Expected:** `window.print()` triggers system print dialog. Button is styled as outlined with print icon.

---

### TC-APPT-031 — Status history timeline shows on detail page
**Prompt:**
> Navigate to `/appointments/appt-1` (a confirmed appointment).
> Scroll to the left column. Assert: "Patient Timeline" card is visible.
> Assert: at minimum 2 entries: `pending` (System) → `confirmed` (Admin User), each with timestamp.

**Expected:** `status_logs` generated by `getAppointmentById` for all mock records. Timeline card visible. Pending-only appointments show 1 entry.

---

### TC-APPT-032 — Patient card uses teal theme (no blue)
**Prompt:**
> Navigate to any appointment detail page.
> Assert: the patient card top accent bar is teal (`#006D77→#00858F`), not blue.
> Assert: patient avatar background is teal `#006D77`, not `#1A73E8`.

**Expected:** No blue (`#1A73E8` / `#4285F4`) visible on detail page. Dashboard "+ New Booking" button also teal.

---

### TC-APPT-033 — End-time before start-time validation on edit
**Prompt:**
> Navigate to `/appointments/appt-1/edit`.
> Set the End Date & Time to a time BEFORE the Start Date & Time.
> Assert: End Date field turns red with helper text "End time must be after start time".
> Assert: Save Changes button is disabled (greyed out).
> Set End Time back to AFTER Start Time. Assert: error clears and button re-enables.

**Expected:** `endBeforeStart` computed flag drives `error` + `helperText` on End DateTimePicker and `disabled` on Save button.

---

### TC-APPT-034 — Invalid appointment ID shows empty state
**Prompt:**
> Navigate to `/appointments/appt-9999`.
> Assert: page shows calendar icon + "Appointment not found" text.
> Assert: "← Back" button is present; clicking it returns to `/appointments`.

**Expected:** `if (!apt)` guard renders empty state with navigation back.

---

## 4. v3 New Test Cases (SUG-APPT-006, NEW-APPT-004, SUG-APPT-010, SUG-APPT-012)

### TC-APPT-035 — Bulk row selection + action bar (SUG-APPT-006)
**Prompt:**
> On `/appointments` → "All" tab, click 3 row checkboxes.
> Assert: a teal action bar animates in above the DataGrid showing "3 appointments selected".
> Assert: "Export Selected" and "Bulk Cancel" buttons are visible.
> Assert: a deselect (×) icon button is visible.
> Click the deselect icon. Assert: action bar hides (collapses).

**Expected:** CSS `max-height`/`opacity` transition shows/hides the bar. `rowSelectionModel` drives the count.

---

### TC-APPT-036 — Bulk export selected (SUG-APPT-006)
**Prompt:**
> Select 3 rows, click "Export Selected".
> Assert: green snackbar "Exported 3 selected appointments as CSV".
> Assert: action bar disappears after export.
> Assert: downloaded file is 10-column CSV.

**Expected:** `handleExportSelected()` creates 10-column CSV blob, triggers download, clears `rowSelectionModel`.

---

### TC-APPT-037 — Bulk cancel (SUG-APPT-006)
**Prompt:**
> Select 2–3 rows with non-terminal statuses (Pending or Confirmed).
> Click "Bulk Cancel".
> Assert: warning snackbar "N appointments cancelled."
> Assert: all selected rows immediately show red "Cancelled" chip.
> Assert: action bar disappears.

**Expected:** `handleBulkCancel()` filters non-terminal rows, applies `setOptimisticCancelled`, fires mutations.

---

### TC-APPT-038 — Send Reminder channel selection (NEW-APPT-004)
**Prompt:**
> Navigate to `/appointments/appt-1`.
> Click "Send Reminder" button.
> Assert: a dialog opens (not a direct snackbar).
> Assert: dialog title is "Send Reminder".
> Assert: Email and SMS radio options are shown with patient contact details.
> If patient has no phone, SMS radio is disabled with "No phone on file" badge.
> Select Email, click "Send via Email".
> Assert: dialog closes.
> Assert: after ~1.5s snackbar reads "Reminder sent via EMAIL to [email]".
> Repeat: open dialog, select SMS, click "Send via SMS".
> Assert: snackbar reads "Reminder sent via SMS to [phone]".

**Expected:** `ReminderDialog` with controlled RadioGroup; `handleSendReminder(channel)` dispatches channel-aware snackbar.

---

### TC-APPT-039 — Reschedule dialog (SUG-APPT-010)
**Prompt:**
> Navigate to `/appointments/appt-1`.
> Click the purple "Reschedule" button in the Actions panel.
> Assert: dialog titled "Reschedule Appointment" opens.
> Assert: current appointment datetime is shown in the subtitle.
> Assert: two DateTimePickers: "New Start Date & Time" and "New End Date & Time".
> Set end time BEFORE start time. Assert: error helperText appears, Confirm button disabled.
> Set valid start and end (end after start).
> Click "Confirm Reschedule".
> Assert: dialog closes. Green snackbar "Appointment rescheduled successfully."
> Assert: navigates back to `/appointments`.

**Expected:** `RescheduleDialog` with `endBeforeStart` validation; `handleReschedule(start, end)` closes dialog + navigates.

---

### TC-APPT-040 — Service-specific pre-visit checklist (SUG-APPT-012)
**Prompt:**
> Navigate to `/appointments/appt-1` (GP Consultation service).
> Scroll to "Pre-visit Checklist" card.
> Assert: label "Specific to: GP Consultation" is visible above checklist items.
> Assert: checklist contains GP-specific items (e.g., "Bring previous lab results", "Note any recent symptoms").
> Assert: items are NOT the generic 4-item list.
> Navigate to an appointment with a different service (e.g., Dental).
> Assert: checklist shows Dental-specific items (e.g., "Brush and floss before your appointment").

**Expected:** `getChecklist(serviceName)` exact/partial maps to `SERVICE_CHECKLISTS`; each service renders unique items.
