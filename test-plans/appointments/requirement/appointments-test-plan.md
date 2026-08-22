---
id: TP003
type: test-plan
feature: appointments
created: 2026-03-19
updated: 2026-08-22
status: approved
parent: REQ013
related: [TR003, PLAN023]
---

# Appointments — Test Plan

**Data source: real backend as of 2026-08-22** (previously `MockStore`'s 35-record dataset — see `context/test-coverage-audit-2026-08-22/manifest.md` and `PLAN023` for the full rewrite rationale). Rewritten under `REQ013`/`PLAN023` Phase A after this session's Priority 3 sweep found and fixed 2 real bugs across the files this plan covers, one of which this document's previous version specced as the *correct* expected result.

**Feature area:** `/src/pages/appointments/`
**Files:** `index.jsx`, `create.jsx` (wraps `components/BookingWizard/*`), `detail.jsx`, `edit.jsx`
**Routes tested:** `/appointments`, `/appointments/new`, `/appointments/:id`, `/appointments/:id/edit`
**GraphQL:** `APPOINTMENTS_QUERY`, `APPOINTMENT_DETAIL_QUERY`, `CANCEL_APPOINTMENT_MUTATION`, `COMPLETE_APPOINTMENT_MUTATION`, `MARK_NO_SHOW_MUTATION`, `UPDATE_APPOINTMENT_MUTATION`, `CREATE_APPOINTMENT_MUTATION`, `CREATE_PATIENT_MUTATION`.

## What changed from the mock-era version of this plan

1. **TC-APPT-028** (old, sidebar pending-count badge) specced `MockStore.getAppointments({status:'pending'}).length` as the correct sidebar implementation. `components/Layout/Sidebar.jsx` — the file this badge lived in — was deleted this session as confirmed-orphaned dead code (zero live importers, fully superseded by `layouts/AppShell.jsx`, which has no equivalent badge at all). **This feature no longer exists in the app.** Removed below rather than carried forward as if still real.
2. **TC-APPT-039** (old, Reschedule dialog) only asserted the dialog UI and a success snackbar — it never asserted the appointment's `start_datetime` actually persisted. This is exactly the blind spot that let `appointments/detail.jsx`'s Reschedule handler ship calling `MockStore.updateAppointment()` unconditionally, even for a real appointment — the success toast fired but nothing was ever saved to the real database. Corrected below with a real persistence assertion, matching the fix (wired to the real, already-defined `UPDATE_APPOINTMENT_MUTATION`).
3. **TC-APPT-022** (old, contextual empty state) asserted only that *some* empty-looking UI appears — the exact bug this session found in `appointments/index.jsx` and `calendar/index.jsx` (`rows = apiRows.length > 0 ? apiRows : mockRows`, falling back to 35 fabricated rows / a month of fabricated events on any real empty result, not just a real error) would have passed this old assertion, since the fallback still rendered *something* that looked like results, not an empty state — the bug only became visible with a specific, real, zero-match filter (confirmed live: `status=no_show` rendered 3 completely fake patients). Corrected below to assert against a filter combination proven to have zero real matches.
4. **TC-APPT-010/011** (old) referenced mock ids `appt-1` and `mock-50` directly. Real appointment ids are UUIDs; rewritten to reference a real seeded appointment by patient name lookup, matching how `manager-appointments.spec.js` already does this.
5. **Mock Data Reference** section (old, 35 named mock rows) removed — the real dataset is a handful of seeded rows (patients: Anita Sharma, Pranav Tripathi, Test Patient ×2) plus accumulating e2e-created test data, not a fixed 35-row set.
6. `appointments/create.jsx`/`BookingWizard` and `appointments/edit.jsx` were checked this session and confirmed **already correct** — `create.jsx` has zero `mocks/store`/`useMockData` imports anywhere in its 5-step wizard (fully real `CREATE_APPOINTMENT_MUTATION`/`CREATE_PATIENT_MUTATION`); `edit.jsx` is real-primary with an explicitly-labeled "(mock mode)" fallback only on a genuine `networkError`, the correct pattern. No behavioral corrections needed for either — only mock-id references removed from the cases that touch them.

---

## 1. Appointments List Page (`/appointments`)

### TC-APPT-001 — List loads with Upcoming / Past / All tabs and real data
**Steps:** Navigate to `/appointments`.
**Expected:** 3-tab strip ("Upcoming", "Past", "All"), "Upcoming" selected by default. Subtitle reflects the real filtered count. "Export CSV" button next to "+ New Booking". Filter toolbar: Patient name, Status, Clinician, From/To date pickers, Clear icon. Status chips render per real appointment status. No blank screen. Covered live: `manager-appointments.spec.js` › `manager sees real seeded appointments`.

---

### TC-APPT-002 — Search by patient name
**Steps:** Type a real patient's name (e.g. "Anita") in the Patient name field, press Enter (the field commits on Enter/blur, not on every keystroke — see `handleSearchKeyDown`).
**Expected:** Table updates to only rows matching that real patient. Clearing restores the full real list.

---

### TC-APPT-003 — Filter by status
**Steps:** Open the Status dropdown → select a real status present in the current data (e.g. "Scheduled").
**Expected:** Only matching rows shown; subtitle count updates to the real filtered count.

---

### TC-APPT-004 — Filter by date range
**Steps:** Set From/To dates spanning a real appointment's date.
**Expected:** Only appointments within that real range shown.

---

### TC-APPT-005 — Clear all filters resets table
**Steps:** Apply a status filter and a search term. Click the Clear Filters icon.
**Expected:** Search clears, status resets to "All Statuses", tab returns to "Upcoming", date pickers clear, the full real "Upcoming" set returns.

---

### TC-APPT-006 — View icon navigates to detail page
**Steps:** Click the View (eye) icon on any real row.
**Expected:** Navigates to `/appointments/:id` with the real appointment's real id; detail page renders that appointment's real data. Covered live: `manager-appointments.spec.js` › `rescheduling a real appointment calls the real updateAppointment mutation` (navigates via this same action as setup).

---

### TC-APPT-007 — New appointment button navigates to the real booking wizard
**Steps:** Click "+ New Booking" (header button and FAB).
**Expected:** Navigates to `/appointments/new`; the real 5-step `BookingWizard` loads (already confirmed fully real this session — `CREATE_APPOINTMENT_MUTATION`/`CREATE_PATIENT_MUTATION`, no mock fallback anywhere in the flow).

---

### TC-APPT-008 — Cancel dialog opens
**Steps:** On a non-terminal-status real row, click the Cancel icon.
**Expected:** `CancelDialog` opens ("Cancel Appointment" title, warning text, optional reason textarea with autofocus, "Keep Appointment"/"Cancel Appointment" buttons). No mutation fires yet.

---

### TC-APPT-009 — Confirm cancel calls the real mutation with an optimistic update
**Steps:** Open the cancel dialog on a real non-terminal appointment, enter a reason, confirm.
**Expected:** Dialog closes immediately; the row's status chip flips to "Cancelled" optimistically, before the mutation resolves; a real `CANCEL_APPOINTMENT_MUTATION` fires in the background against the real appointment's real id.

---

### TC-APPT-010 — Detail page loads for a real appointment
**Steps:** From the list, open a real appointment's detail page (do not hardcode a UUID — look it up by a known real patient name, e.g. "Anita Sharma", matching `manager-appointments.spec.js`'s own pattern, since ids are not stable seed-data constants).
**Expected:** All detail cards populated with that appointment's real data; action buttons match its real (non-terminal) status.

---

### TC-APPT-011 — Invalid/unmatched appointment id shows a real not-found state
**Steps:** Navigate to `/appointments/00000000-0000-0000-0000-000000000000` (a syntactically valid but non-existent UUID).
**Expected:** "Appointment not found" + icon + "← Back" button, no crash. (The file's own `mockIdx`/`appt-N`-style id-lookup fallback was checked this session and confirmed harmless in practice — real UUIDs never collide with the mock store's `appt-N` ids, so it never actually triggers on real navigation; noted here so it isn't rediscovered as a false alarm.)

---

### TC-APPT-012 — Edit button navigates to edit
**Steps:** On a real appointment's detail page, click "Edit".
**Expected:** Navigates to `/appointments/:id/edit`; form pre-filled with that appointment's real current values (via `edit.jsx`'s real `APPOINTMENT_DETAIL_QUERY`).

---

### TC-APPT-013 — Send Reminder (simulated send, not a real dispatch)
**Steps:** On a non-terminal real appointment's detail page, click "Send Reminder", pick a channel (Email/SMS — SMS disabled with "No phone on file" if the real patient has none).
**Expected:** Dialog closes, button shows "Sending…" for ~1.5s, a channel-aware success snackbar shows the real patient's real email/phone. **This is a simulated UI-only delay, not a real SMS/email dispatch** — no real notification-sending mutation exists for this button; it was never real and this test case doesn't claim otherwise.

---

## 2. Create Appointment (`/appointments/new`)

### TC-APPT-014 — Create form validates required fields
**Steps:** Open the wizard, try to proceed without required fields.
**Expected:** Progression blocked; required fields highlighted.

---

### TC-APPT-015 — 5-step wizard completes and creates a real appointment
**Steps:** Walk all 5 steps (Clinic → Clinician+Service → Date/Time → Patient details → Confirm) with real data, submit.
**Expected:** A real `createAppointment` mutation fires (and `createPatient` first, if "New Patient" was chosen); the created appointment is real and later visible on `/appointments`.

---

### TC-APPT-016 — Wizard back navigation preserves data
**Steps:** On Step 4, click Back.
**Expected:** Returns to Step 3 with the previously-selected date/slot still shown selected — state is not reset.

---

## 3. Edit Appointment (`/appointments/:id/edit`)

### TC-APPT-017 — Edit form pre-fills with the real appointment's data
**Steps:** Navigate to a real appointment's `/edit` route.
**Expected:** Status, Clinician, Start/End datetime all pre-filled from a real `APPOINTMENT_DETAIL_QUERY` response.

---

### TC-APPT-018 — Save calls the real update mutation (primary path)
**Steps:** Change Status → "Completed" → Save Changes.
**Expected:** Real `UPDATE_APPOINTMENT_MUTATION` fires; on success, "Appointment updated successfully" snackbar, navigate to detail, the change is really persisted. **Secondary case (offline resilience, not primary):** on a genuine `networkError`, falls back to `MockStore` with a distinctly-labeled "(mock mode)" snackbar — re-verified this session as correctly gated on a real failure, not an empty-result heuristic.

---

### TC-APPT-019 — Reschedule via the edit form changes date and time for real
**Steps:** Change Start/End date-time, Save.
**Expected:** New values captured and sent to the real `UPDATE_APPOINTMENT_MUTATION`; success snackbar; the new datetime is really persisted (reload/re-query to confirm, not just the toast).

---

## 4. Additional behavior

### TC-APPT-020 — Upcoming/Past/All tabs use the current moment as the boundary
**Steps:** Click "Past" — assert appointments earlier today (before the current time) appear here, not in a gap. Click "Upcoming" — only appointments after the current time. Apply an explicit date filter while on "Upcoming" — it overrides the tab's implicit bound.
**Expected:** `dayjs()` (current moment), not start/end-of-day, is the real boundary.

---

### TC-APPT-021 — Export CSV respects the active tab/filters
**Steps:** On "All", click Export CSV — assert the download and a snackbar with the real exported count and "(10 columns)". Switch to "Upcoming", export again — assert the count and filename update to match.
**Expected:** 10-column CSV (ID, Patient, Email, Clinician, Service, Date & Time, Duration, Status, Room, Clinic) scoped to the currently active tab/filters.

---

### TC-APPT-022 — A real filter with zero matches shows a real empty state, not fabricated rows
**Steps:** On `/appointments` "All" tab, filter Status to a value proven to have zero real matches for this org (e.g. "No Show", if none of the current real seeded appointments carry that status — confirm via a quick real-data check before relying on it, since the real dataset is not fixed).
**Expected:** Zero rows, real "No appointments match your filters" empty state with a "Clear all filters" action. **Not** 35 fabricated `MockStore` rows — the exact bug found and fixed this session. Covered live: `manager-appointments.spec.js` › `a real filter with zero matches shows a real empty state, not fabricated mock rows`.

---

### TC-APPT-023 — Inline status change via chip click
**Steps:** Click a non-terminal status chip on a real row → select a new status from the dropdown.
**Expected:** Chip updates immediately (optimistic); real `UPDATE_APPOINTMENT_MUTATION` fires with the new status; success snackbar names the new status.

---

### TC-APPT-024 — Terminal statuses don't open the inline menu
**Steps:** Click a "Cancelled"/"Completed"/"No Show" chip.
**Expected:** No dropdown opens; cursor is not a pointer on that chip.

---

### TC-APPT-025 — Bulk selection + action bar
**Steps:** Select 3 real rows via checkboxes.
**Expected:** A teal action bar animates in with "3 appointments selected", "Export Selected"/"Bulk Cancel" buttons, a deselect icon. Deselecting collapses the bar.

---

### TC-APPT-026 — Bulk export selected
**Steps:** Select 3 rows, click "Export Selected".
**Expected:** Real 10-column CSV of exactly those 3 real rows downloads; snackbar confirms the count; action bar clears.

---

### TC-APPT-027 — Bulk cancel
**Steps:** Select 2–3 non-terminal real rows, click "Bulk Cancel".
**Expected:** Real `CANCEL_APPOINTMENT_MUTATION` fires per row (reason: "Bulk cancellation"); rows show "Cancelled" optimistically; snackbar confirms the count; action bar clears.

---

### TC-APPT-028 *(removed — feature no longer exists)*
Previously: sidebar pending-appointment-count badge. `components/Layout/Sidebar.jsx` (the file this lived in) was deleted this session as confirmed dead/orphaned code — zero live importers, fully superseded by `layouts/AppShell.jsx`, which has no equivalent badge. There is nothing to test here anymore; kept as a removed entry rather than silently renumbering, so the gap in the sequence is explained.

---

### TC-APPT-029 — Print appointment detail
**Steps:** On a real appointment's detail page, click "Print".
**Expected:** Browser print dialog opens (`window.print()`).

---

### TC-APPT-030 — Status history timeline shows real `status_logs`
**Steps:** On a real appointment's detail page, view "Patient Timeline".
**Expected:** Real entries from the appointment's real `status_logs` (a field on the `Appointment` GraphQL type) — at minimum a `pending`/creation entry; more entries if the real status has changed since creation.

---

### TC-APPT-031 — End-time-before-start-time validation on edit
**Steps:** On a real appointment's edit form, set End before Start.
**Expected:** End field shows a red error + "End time must be after start time"; Save button disabled. Fixing the order clears the error and re-enables Save.

---

### TC-APPT-032 — Send Reminder channel selection
**Steps:** Click "Send Reminder" on a non-terminal real appointment.
**Expected:** Dialog with Email/SMS radios showing the real patient's real contact details; SMS disabled with "No phone on file" if the real patient record has no phone. Selecting a channel and confirming shows a channel-aware snackbar (see TC-APPT-013 — this remains a simulated send, not a real dispatch).

---

### TC-APPT-033 — Reschedule dialog persists the new time for real
**Steps:** On a real appointment's detail page, click "Reschedule". Set a new start time (end time is UI-only in the dialog — the real `UPDATE_APPOINTMENT_MUTATION` accepts `start_datetime` only; `end_datetime` is recomputed server-side from the service's `duration_minutes`, per `appointments.service.ts`'s `update()`). Confirm.
**Expected:** Dialog closes, "Appointment rescheduled successfully." snackbar, navigates to `/appointments`. **The new `start_datetime` must be verified as actually persisted** (re-query or reload) — this is exactly the assertion the old version of this test case was missing, which is why the real bug (mock-only write) shipped undetected. Covered live: `manager-appointments.spec.js` › `rescheduling a real appointment calls the real updateAppointment mutation`, which asserts the real `UpdateAppointment` GraphQL response has no errors and the mutation genuinely fired.

---

### TC-APPT-034 — Service-specific pre-visit checklist
**Steps:** View a real appointment's detail page for a given real service (e.g. "GP Consultation").
**Expected:** "Specific to: <service name>" label with that service's checklist items (frontend-only static content, `SERVICE_CHECKLISTS`, matched by service name — not backed by a real per-service database record, and was never meant to be; this is a legitimate, intentionally static UI feature, not a mock-data gap).

---

## Edge cases

| # | Edge case | Expected |
|---|-----------|----------|
| E1 | A real filter combination matches zero real appointments | Real empty state — not 35 fabricated rows (TC-APPT-022) |
| E2 | Real backend genuinely unreachable | `error` set → visible, distinctly-labeled mock fallback (`edit.jsx`'s "(mock mode)" pattern) — the one case that fallback is *for* |
| E3 | Appointment id doesn't match any real row | "Appointment not found" empty state, no crash |
| E4 | Real appointment has no `service` | Checklist section shows the default checklist, no crash |
| E5 | Real patient has no phone | SMS reminder option disabled with a clear reason, not silently hidden |
| E6 | Reschedule to a slot the clinician is already booked for | Real backend rejection (`assertSlotFree` in `appointments.service.ts`), surfaced to the user |
| E7 | End time set before start time (create or edit) | Real-time validation blocks Save, independent of backend round-trip |

---

## Session history

| Session | Change |
|---|---|
| 2026-03-16 – 2026-03-27 | Mock-era baseline, 38 cases (later 39/40 with reschedule/checklist additions) against `MockStore`'s 35-record dataset, all "passing" against mock behavior only |
| 2026-08-22 (`REQ013`/`PLAN023` Phase A) | Full rewrite against the real backend. 1 real bug found and fixed in the process (reschedule silently mock-only writing to a real appointment — see "What changed" above); the sidebar pending-badge feature confirmed removed from the app entirely. Re-executed and re-verified — see `TR003`. |
