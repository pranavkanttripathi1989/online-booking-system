# Appointments & Booking — Test Cases

**Domain covers:** the multi-step patient booking wizard, appointment CRUD across admin/staff/patient surfaces, status transitions and audit trail, cancellation/reschedule rules, double-booking prevention, and the calendar view (FullCalendar + real-time subscription).
**Grounded in:** `test-plan/appointments-test-plan.md`, `booking-wizard-test-plan.md`, `patient-appointment-test-plan.md`, `calendar-test-plan.md`, `patient-portal/patient-appointments-test-plan-done.md`, `staff/staff-appointments-test-plan-done.md` and their `test-result/`/`test-suggestion/` counterparts, `context/frontend-contract-analysis.md §2/§6/§7`, `schema.prisma` (`Appointments`, `ProductCancellationRules`), `context/backend-implementation-plan.md` Phase 7.
**Note on architecture:** the frontend has **three separate implementations** of "the appointment list" — admin (`appointments/index.jsx`, `MockStore`, 35 records, 6 statuses incl. `pending`/`no_show`/`rescheduled`), staff (`staff/Appointments.jsx`, local state, 4 records), and patient (`patient/Appointments.jsx`, local state, 4-status vocabulary `scheduled`/`confirmed`/`completed`/`cancelled`) — each with its own CSV column set, empty-state UI, and cancellation dialog. Test cases below are grouped by concern but call out role-specific divergence explicitly rather than assuming one implementation covers all three.
**Known gap flagged by this research:** no existing QA doc anywhere exercises server-side double-booking prevention, a cancellation-fee deadline, or a booking-race-condition — the frontend only greys out already-booked slots client-side. The API/E2E sections below treat this as the central forward-looking spec for Phase 7, not a regression suite.

---

## 1. Unit Test Cases

### TC-APPT-UNIT-001 — Status-transition validator rejects invalid transitions
- **Priority:** Critical
- **Steps:** Attempt transitions `completed → pending`, `cancelled → confirmed`, and `no_show → completed` through the transition-validation function.
- **Expected Result:** All three rejected — the state machine only allows `pending/scheduled → confirmed → completed|no_show`, and any non-terminal status → `cancelled`; terminal statuses (`cancelled`, `completed`, `no_show`) accept no further transition, matching the terminal-chip guard already observed in the admin list (SUG-APPT-005).

### TC-APPT-UNIT-002 — End-time-before-start-time validator is one shared rule across three call sites
- **Priority:** High
- **Steps:** Call the shared validator with `end <= start` from the appointment edit-form context, the reschedule-dialog context, and the create-form context.
- **Expected Result:** All three reject identically with "End time must be after start time" — grounded in the fact this exact message and rule appears independently in the admin edit form (TC-APPT-033), the reschedule dialog (SUG-APPT-010), and mirrors the same rule already enforced in the Availability/Blocks domain; a single shared validator prevents the three call sites drifting out of sync.

### TC-APPT-UNIT-003 — Cancellation-fee calculator applies `ProductCancellationRules` thresholds correctly
- **Priority:** Critical
- **Preconditions:** A `ProductCancellationRules` row exists: `rule_type: cancellation`, `hours_before_appointment: 24`, `fee_type: fixed`, `fee_amount: 50000` (paise).
- **Steps:** Compute the fee for a cancellation submitted 30 hours before the appointment, then one submitted 10 hours before.
- **Expected Result:** 30-hour case → fee `0`. 10-hour case → fee `50000`. No existing test-plan documents this rule at all today (see domain note above) — this closes that gap.

### TC-APPT-UNIT-004 — Reschedule uses its own `rule_type: reschedule` row, independent of the cancellation rule
- **Priority:** High
- **Preconditions:** A product has both a `cancellation` rule (fee 50000) and a `reschedule` rule (fee 20000) with different `hours_before_appointment` thresholds.
- **Steps:** Compute the fee for a reschedule request inside the reschedule rule's window but outside the cancellation rule's window.
- **Expected Result:** Only the `reschedule` rule's fee applies — proves the two rule types are looked up independently, not by mistakenly reusing the cancellation rule for reschedules.

### TC-APPT-UNIT-005 — Double-booking predicate flags overlapping clinician time ranges
- **Priority:** Critical
- **Steps:** Evaluate the overlap predicate for two proposed appointments on the same `clinician_id`: (a) 10:00–10:30 and 10:15–10:45 (overlapping), (b) 10:00–10:30 and 10:30–11:00 (back-to-back, touching but not overlapping).
- **Expected Result:** (a) flagged as conflicting. (b) not flagged — matches the exclusion-constraint semantics `backend-implementation-plan.md` Phase 7 specifies (`tstzrange` half-open interval).

### TC-APPT-UNIT-006 — Double-booking predicate applies equally to `room_id`
- **Priority:** Critical
- **Steps:** Evaluate the same predicate for two different clinicians proposed into the same `room_id` with overlapping times.
- **Expected Result:** Flagged as conflicting — the constraint must protect rooms independently of clinicians, since a room can only physically host one appointment at a time regardless of which clinician runs it.

### TC-APPT-UNIT-007 — Upcoming/Past tab boundary uses current datetime, not day boundaries
- **Priority:** High
- **Preconditions:** Grounded in NEW-APPT-001/003 (implemented) — this exact bug (start/end-of-day boundary leaving same-day appointments in "no-man's land") was previously fixed.
- **Steps:** Classify two same-day appointments: one 1 hour in the past, one 1 hour in the future, relative to `dayjs()` at test time.
- **Expected Result:** The past one classifies as "Past," the future one as "Upcoming" — regression guard against the exact bug this was fixed for.

### TC-APPT-UNIT-008 — CSV column-set generator produces the documented 10-column admin export
- **Priority:** Medium
- **Steps:** Call the admin appointments list's CSV-row generator for one record.
- **Expected Result:** Exactly 10 columns in this order: ID, Patient, Email, Clinician, Service, Date & Time, Duration, Status, Room, Clinic (SUG-APPT-009/NEW-APPT-002). Note this diverges from the staff module's 8-column export (no Email/Room/Clinic) — each module's generator must be tested against its own documented column set, not a shared one.

### TC-APPT-UNIT-009 — Mock numeric-ID fallback resolver maps out-of-range IDs, and why that must NOT ship to the real backend
- **Priority:** Medium
- **Steps:** Call the mock detail-lookup helper with `id: "mock-50"` against a 35-record store.
- **Expected Result:** Resolves via `parseInt('50') % 35 = 15` to a valid record rather than throwing — this is documented, intentional mock-layer behavior (TC-APPT-011/TC-CAL-011). Note for the backend implementer: the real resolver must instead return a clean 404/null for an unknown UUID, not silently wrap around to an unrelated record — this unit test exists to make the divergence explicit before Phase 7 starts.

### TC-APPT-UNIT-010 — Service checklist lookup never throws on an unknown service name
- **Priority:** Low
- **Steps:** Call `getChecklist("Some Brand New Service")`, `getChecklist("Dermatology Consult")` (partial match), `getChecklist("Dermatology")` (exact match).
- **Expected Result:** Exact match wins when present; partial match used next; otherwise falls back to the generic 4-item default — never throws or returns `undefined` (SUG-APPT-012).

### TC-APPT-UNIT-011 — Appointment-type toggle recalculates slot duration for the same service
- **Priority:** Medium
- **Steps:** Call the duration-resolution function for one service with `apptType: 'in_person'` then `apptType: 'video'`.
- **Expected Result:** Returns different durations if the service defines type-specific durations (TC-BOOK-012) — video and in-person must not silently share a duration value that was only ever validated for one of them.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-APPT-API-001 — `createAppointment` seeds the audit trail the frontend already expects
- **Priority:** Critical
- **Steps:** Call `createAppointment` with valid inputs, then fetch its detail including `status_logs`.
- **Expected Result:** Response includes a single `status_logs` entry (`status: pending`, actor: System, timestamp), matching the "Patient Timeline" shape already rendered by the frontend (TC-APPT-031). **Implementation note:** `schema.prisma` currently has **no `AppointmentStatusLogs` model at all** — this model must be added before this test can pass; flagging it here since the frontend contract already assumes it exists.

### TC-APPT-API-002 — Double-booking is enforced at the database layer under concurrency
- **Priority:** Critical
- **Steps:** Fire two `createAppointment` mutations for the same `clinician_id` and overlapping time ranges as close to simultaneously as the test harness allows (e.g. `Promise.all`).
- **Expected Result:** Exactly one succeeds; the other is rejected with a clear conflict error — proves the Postgres exclusion constraint (not an app-level read-then-write check, which has a race window) is what actually prevents this, per `backend-implementation-plan.md` Phase 7's explicit call-out that this was "the deciding factor for Postgres over Mongo."

### TC-APPT-API-003 — The same constraint protects `room_id` independent of `clinician_id`
- **Priority:** Critical
- **Steps:** Fire two concurrent `createAppointment` calls for different clinicians but the same `room_id` and overlapping times.
- **Expected Result:** Exactly one succeeds — server-side expression of TC-APPT-UNIT-006.

### TC-APPT-API-004 — `cancelAppointment` writes a status-log row with actor and timestamp
- **Priority:** High
- **Steps:** Cancel a confirmed appointment, fetch its `status_logs`.
- **Expected Result:** A new entry is appended (`from: confirmed, to: cancelled`, actor = the calling user, timestamp = now) — the log is append-only, prior entries are untouched.

### TC-APPT-API-005 — `cancelAppointment` is idempotent
- **Priority:** High
- **Preconditions:** Grounded in TC-STFAPPT-30 (mock-layer idempotency already verified for bulk-cancel).
- **Steps:** Cancel an already-cancelled appointment.
- **Expected Result:** No error, no duplicate `status_logs` row appended — the server-side equivalent must hold, not just the frontend's optimistic local state.

### TC-APPT-API-006 — `cancelAppointment` computes and surfaces the cancellation fee server-side
- **Priority:** Critical
- **Preconditions:** A `ProductCancellationRules` row with a 24h window and a fixed fee exists for the appointment's product.
- **Steps:** Cancel inside the window; cancel a different appointment outside the window.
- **Expected Result:** Inside-window response includes the computed non-zero fee (and, per the spec, a corresponding `PaymentTransactions` charge record); outside-window response shows fee `0` — the frontend today has zero cancellation-fee logic anywhere, so this is entirely new server-side enforcement, not a regression of existing behavior.

### TC-APPT-API-007 — `rescheduleAppointment` rejects an invalid new time range
- **Priority:** High
- **Steps:** Call `rescheduleAppointment` with `new_end <= new_start`.
- **Expected Result:** Rejected — server-side enforcement of TC-APPT-UNIT-002's rule, exercised through the actual resolver rather than a pure function.

### TC-APPT-API-008 — `rescheduleAppointment` re-validates double-booking against the NEW slot
- **Priority:** Critical
- **Preconditions:** Clinician has an existing appointment at 14:00–14:30 (separate from the one being rescheduled).
- **Steps:** Reschedule a different appointment for the same clinician to 14:15–14:45 (overlapping the existing one).
- **Expected Result:** Rejected — a naive implementation might only free the old slot and insert the new one without re-checking collisions; this test specifically targets that failure mode.

### TC-APPT-API-009 — A patient's appointments query returns only their own rows by default
- **Priority:** Critical
- **Preconditions:** Grounded in SUG-PTAPPT-009 ("a genuine backend milestone" — this is the pending real backend the patient appointments page needs).
- **Steps:** Log in as Patient A, call the patient-scoped appointments query with no filter arguments.
- **Expected Result:** Returns only Patient A's appointments — there must be no way to pass a different `patient_id` and see someone else's, mirroring `TC-AUTH-API-008`'s row-level-scoping guarantee.

### TC-APPT-API-010 — A clinician's appointments query returns only their own schedule
- **Priority:** Critical
- **Steps:** Log in as Clinician C1, query appointments with no filter.
- **Expected Result:** Returns only appointments where `clinician_id` = C1's own clinician record.

### TC-APPT-API-011 — `markNoShow` is rejected on an already-terminal appointment
- **Priority:** Medium
- **Steps:** Call `markNoShow` on an appointment already `cancelled`, then on one already `completed`.
- **Expected Result:** Both rejected — server-side expression of TC-APPT-UNIT-001's terminal-state rule, specifically for the `no_show` action which has no dedicated test anywhere in existing QA history (flagged as a gap in the research).

### TC-APPT-API-012 — Paginated `appointments` query combines filters with AND semantics
- **Priority:** High
- **Preconditions:** Grounded in the calendar page's existing AND-filter contract (TC-CAL-019: Type=Video AND Status=Confirmed).
- **Steps:** Query with `patientName`, `status`, `clinicianId`, and a date range all set simultaneously.
- **Expected Result:** Only records matching all four constraints are returned — not a union of any-match results.

### TC-APPT-API-013 — Cross-tenant isolation on direct appointment lookup
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have their own clinics/appointments.
- **Steps:** Log in as a manager of Org 1, query a specific `appointment(id: <Org2Appointment.id>)`.
- **Expected Result:** Rejected or null — mirrors `TC-AUTH-API-010`'s multi-tenancy guarantee applied to this domain.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-APPT-E2E-001 — Full booking wizard happy path
- **Priority:** Critical
- **Steps:** Select a service → select a clinician (filtered by that service) → pick a date/time (already-booked slots are greyed out and unclickable) → confirm.
- **Expected Result:** Success screen shows an appointment reference number and the exact copy "A confirmation email has been sent to {patient email}" (TC-BOOK-009/014); the appointment is queryable immediately afterward via the patient's own appointments list.
- **Notes:** The two existing wizard plans (`appointments-test-plan.md` TC-APPT-015 vs. `booking-wizard-test-plan.md`) describe a 5-step vs. 4-step flow inconsistently, and neither documents a payment step despite CLAUDE.md specifying Razorpay for patient payments — re-verify actual step count and confirm whether/where payment collection happens in the current `booking/` implementation before finalizing this test's step list.

### TC-APPT-E2E-002 — Wizard Back navigation preserves prior selections
- **Priority:** Medium
- **Preconditions:** Grounded in TC-BOOK-008.
- **Steps:** Progress to the date/time step, click Back to the clinician step.
- **Expected Result:** The previously selected clinician remains highlighted/selected — state is not reset by Back navigation.

### TC-APPT-E2E-003 — Staff booking-for-patient flow submits the correct patient ID
- **Priority:** High
- **Preconditions:** Grounded in TC-BOOK-010.
- **Steps:** As a staff/receptionist user, use the "Booking for patient" search to find and select an existing patient mid-wizard, then complete the booking.
- **Expected Result:** The created appointment's `patient_id` matches the searched-and-selected patient, not the staff member's own account.

### TC-APPT-E2E-004 — Two users racing for the last slot: only one wins
- **Priority:** Critical
- **Preconditions:** A clinician has exactly one remaining bookable slot for a given day.
- **Steps:** Two patients (in two separate sessions/tabs) both select that same slot and submit "Confirm Booking" within moments of each other.
- **Expected Result:** One booking succeeds; the other sees a clear "slot no longer available" error and returns to slot selection — not a silently accepted, invisibly double-booked appointment. This is the end-to-end expression of the double-booking gap flagged as untested anywhere in prior QA history.

### TC-APPT-E2E-005 — Cancellation fee is shown before confirming, and cancellation is reflected everywhere instantly
- **Priority:** High
- **Preconditions:** The appointment falls inside its product's cancellation-fee window.
- **Steps:** Cancel from the patient's appointment list.
- **Expected Result:** The fee is shown in the confirm dialog before the patient commits; once confirmed, the appointment shows as cancelled in the patient's own list AND in the clinic's admin/staff list without requiring a manual refresh.

### TC-APPT-E2E-006 — Reschedule from admin updates another user's live calendar view
- **Priority:** High
- **Preconditions:** Grounded in the currently-unwired GraphQL subscription transport (`frontend-contract-analysis.md §6` — `graphql-ws` is a listed dependency but never configured).
- **Steps:** User A has `/calendar` open for a clinic; User B (in a separate session) reschedules an appointment belonging to that same clinic via the admin detail page.
- **Expected Result:** User A's calendar reflects the change without a manual reload — this is the acceptance test that Phase 10's real-time transport actually closes the gap `calendar-test-suggestion.md` explicitly flags as pending ("Real-time subscription event highlighting — needs WebSocket infra").

### TC-APPT-E2E-007 — Completing an appointment triggers exactly one scheduled review-request email
- **Priority:** Medium
- **Steps:** Mark an appointment `completed`, then advance the scheduled-job clock past the configured delay.
- **Expected Result:** Exactly one `review_request` email is sent to the patient (Phase 9) — verify it doesn't double-fire if the job runs more than once against the same appointment.

### TC-APPT-E2E-008 — Staff-created appointments persist across a reload
- **Priority:** High
- **Preconditions:** Grounded in SUG-STFAPPT-012 (pending) — today, appointments created via the staff Book dialog live only in local component state and vanish on reload since they're never written to `MockStore`.
- **Steps:** As staff, create a new appointment via the Book dialog, reload the page.
- **Expected Result:** Once backed by a real mutation, the appointment survives reload — this test is the acceptance bar for closing SUG-STFAPPT-012, not a currently-passing regression case.

### TC-APPT-E2E-009 — Admin CSV export matches the active filters
- **Priority:** Medium
- **Steps:** Apply a status + date-range filter on the admin appointments list, click Export CSV.
- **Expected Result:** Downloaded file's row count matches the filtered count shown on screen, and its 10 columns match the documented set (TC-APPT-021/025/029) — the export must reflect the filtered view, not the full unfiltered dataset.

### TC-APPT-E2E-010 — A cancelled appointment shows zero action buttons on the patient card
- **Priority:** Medium
- **Steps:** View a cancelled appointment on the patient appointments page.
- **Expected Result:** No Cancel/Join/Reschedule/Receipt buttons render — matches the documented status-gated button rules (cancelled → no buttons at all).

### TC-APPT-E2E-011 — Video appointment join enforces telemedicine consent capture
- **Priority:** High
- **Preconditions:** Grounded in `backend-implementation-plan.md`'s India table — Telemedicine Practice Guidelines 2020 require a captured consent record before a video consult proceeds.
- **Steps:** Click "Join Call" on an upcoming video appointment that has no prior consent record.
- **Expected Result:** A consent step is required before the video UI renders, and a `consent_given_at` timestamp (or dedicated `ConsentRecords` row) is persisted — this feature must not ship without it per the stated compliance requirement.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass today, independent of backend readiness, unless explicitly marked as a documented open gap.*

### TC-APPT-FE-001 — Terminal-status chips don't open the inline status-change menu
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-APPT-005/TC-APPT-026/027.
- **Steps:** Click a `cancelled` status chip, then a `pending` status chip, on the admin appointments list.
- **Expected Result:** The `cancelled` chip does nothing (cursor stays default, no dropdown); the `pending` chip opens the status-change dropdown.

### TC-APPT-FE-002 — Filtered-to-zero state differs from the true empty state
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-APPT-003/TC-APPT-022.
- **Steps:** Apply filters that match no records; separately, view the list for a tenant with genuinely zero appointments.
- **Expected Result:** The filtered-to-zero case shows "No appointments match your filters" with a "Clear all filters" action; the genuinely-empty case shows a distinct "No appointments yet" message with no filter-clearing action offered.

### TC-APPT-FE-003 — Sidebar pending-count badge only updates on next render (documented non-reactive limitation)
- **Priority:** Low
- **Preconditions:** Grounded in SUG-APPT-007/TC-APPT-028 — the badge's `useMemo` has an empty dependency array.
- **Steps:** With the appointments list open in one tab, change an appointment's status to `pending` via another action, without navigating away.
- **Expected Result:** The sidebar badge count does **not** update live — only after a subsequent render/reload. This documents a known limitation to be re-verified once real-time subscriptions are wired (Phase 10), not treated as a bug to fix in this test.

### TC-APPT-FE-004 — Bulk-selection action bar appears immediately on row selection
- **Priority:** Medium
- **Preconditions:** Regression guard for BUG-APPT-002 (MUI `<Slide>` + un-normalized `GridRowSelectionModel` previously caused the bar not to appear).
- **Steps:** Check 2 rows in the admin appointments DataGrid.
- **Expected Result:** A teal action bar appears immediately showing "2 appointments selected" with Export Selected / Bulk Cancel actions.

### TC-APPT-FE-005 — Patient appointments search clears on tab switch
- **Priority:** Medium
- **Preconditions:** Regression guard for BUG-PTAPPT-004.
- **Steps:** Type a search term on the Upcoming tab, switch to the Past tab.
- **Expected Result:** The search field is empty on the Past tab — a stale search term from Upcoming must not cause a false "no results" state on Past.

### TC-APPT-FE-006 — Missing price renders "Price TBD," never "£undefined"
- **Priority:** Low
- **Preconditions:** Regression guard for BUG-PTAPPT-005.
- **Steps:** View a patient appointment card whose mock record has no `price` field, sorted by Price.
- **Expected Result:** Displays "Price TBD" — the null-guard `{appt.price != null ? ... : 'Price TBD'}` must be in place.

### TC-APPT-FE-007 — Clicking a card action button doesn't also open the detail dialog
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-PTAPPT-012 (`stopPropagation`).
- **Steps:** Click the Cancel button inside a patient appointment card; separately, click empty space within the same card.
- **Expected Result:** Clicking Cancel only opens the cancel confirm dialog (not the detail dialog); clicking elsewhere on the card opens the detail dialog.

### TC-APPT-FE-008 — Stale bulk selection after filtering (documented open gap)
- **Priority:** Low
- **Preconditions:** Grounded in SUG-STFAPPT-011, **PENDING** — mark this as an expected-fail/known-gap test, not a regression guard.
- **Steps:** On the staff appointments page, select all 4 visible rows, then apply a status filter that leaves only 1 row visible.
- **Expected Result (current/documented behavior):** The bulk action bar still shows "4 selected" even though 3 of those rows are now hidden by the filter. Re-verify this test as *failing* (selection should clear on filter change) once SUG-STFAPPT-011 is implemented.

### TC-APPT-FE-009 — Staff Book dialog requires patient, date, and time before enabling submit
- **Priority:** Medium
- **Preconditions:** Regression guard for BUG-STFAPPT-002 fix + SUG-STFAPPT-010.
- **Steps:** Open the Book Appointment dialog, attempt to submit with each of Patient/Date/Time left blank in turn.
- **Expected Result:** Submit stays disabled until all three are filled — the previously-possible "New Patient / — / scheduled" placeholder row (TC-STFAPPT-24) can no longer be created.

### TC-APPT-FE-010 — Calendar Room View shows type chips only for non-default appointment types
- **Priority:** Low
- **Preconditions:** Grounded in NEW-CAL-016 — this is an explicit, deliberate design choice, not a bug.
- **Steps:** View the calendar's Room View with a mix of in-person, video, and home-visit appointments.
- **Expected Result:** Video shows a teal 🎥 "Video" chip, home-visit shows a 🚗 "Home Visit" chip; in-person shows **no chip at all**, intentionally, to avoid visual clutter.

### TC-APPT-FE-011 — Calendar keyboard shortcuts don't hijack text input or OS shortcuts
- **Priority:** Medium
- **Preconditions:** Grounded in NEW-CAL-014's exact map `{m,w,d,l,r}` → view.
- **Steps:** Type "admin" into the calendar's clinician filter text field; separately, press Cmd+M / Ctrl+W with no field focused.
- **Expected Result:** Typing "admin" does not change the calendar view (the "m" in "admin" must not trigger month view); Cmd/Ctrl-modified keypresses are ignored, preserving the browser's own shortcuts.

### TC-APPT-FE-012 — Calendar drag-and-drop reschedule is not yet implemented (documented gap)
- **Priority:** Low
- **Preconditions:** Grounded in `calendar-test-suggestion.md`'s "Remaining Backend-Dependent Items" — explicitly listed as pending a backend PATCH mutation.
- **Steps:** Attempt to drag an event to a different time slot on the calendar.
- **Expected Result (current/documented behavior):** No effect — this should be re-verified as *functional* only once Phase 7's reschedule mutation and Phase 10's transport both exist.

### TC-APPT-FE-013 — Reschedule dialog disables confirm until the new range is valid
- **Priority:** Medium
- **Preconditions:** Regression guard for SUG-APPT-010.
- **Steps:** Open the Reschedule dialog on an appointment detail page, set a new end time before the new start time.
- **Expected Result:** Inline error shown, "Confirm Reschedule" stays disabled until corrected.

### TC-APPT-FE-014 — Send Reminder dialog disables SMS when the patient has no phone on file
- **Priority:** Low
- **Preconditions:** Regression guard for NEW-APPT-004.
- **Steps:** Open the "Send Reminder" dialog for a patient record with no `phone` value.
- **Expected Result:** The SMS radio option is disabled with a "No phone on file" badge; Email remains selectable and functional.
