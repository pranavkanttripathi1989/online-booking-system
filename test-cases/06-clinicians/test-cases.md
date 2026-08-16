# Clinicians — Test Cases

**Domain covers:** Clinician CRUD (admin/manager list, detail, create, edit), clinician types, languages spoken, and the clinician's own portal dashboard/home page (`/clinician/dashboard`).
**Grounded in:** `schema.prisma` (`Clinicians`, `ClinicianTypeModel`, `ClinicianLanguages`, `Languages`), `context/frontend-contract-analysis.md §2/§8`, and real QA history: `test-plan/clinicians-test-plan.md` + `test-plan/clinicians-test-plan-done.md`, `test-result/clinicians-test-results.md`, `test-suggestion/clinicians-test-suggestion.md`, `test-suggestion/clinician-dashboard-test-suggestion.md`, `test-plan/clinician-portal/clinician-dashboard-test-plan-done.md`, `test-result/clinician-dashboard-test-results.md`.
**Key schema fact:** `Clinicians.clinic_id` is a **single** foreign key (one clinician belongs to exactly one clinic) and `Clinicians.clinician_type` is a **plain string**, not a foreign key to `ClinicianTypeModel` — there is no DB-level constraint forcing it to match an existing, active `ClinicianTypeModel.name`. The frontend's clinician list, however, computes clinic counts using both `c.clinic?.id` **and** a `c.clinics?.some?.(...)` array fallback (`test-suggestion/clinicians-test-suggestion.md` SUG-CLIN-014 code notes) — implying the UI was written expecting clinicians could belong to multiple clinics. This single-vs-multiple-clinic mismatch between schema and frontend expectation must be resolved deliberately before backend work starts (several cases below exist to pin down the chosen behavior), and `clinician_type` needs either a real FK or an application-level validator so it can't drift from the managed type list.

---

## 1. Unit Test Cases

### TC-CLIN-UNIT-001 — `clinician_type` value must match an active `ClinicianTypeModel.name`
- **Priority:** High
- **Steps:** Validate a clinician input with `clinician_type: "Cardiologist"` (exists, `is_active: true`), then `clinician_type: "Herbalist"` (does not exist in `ClinicianTypeModel`), then `clinician_type: "Podiatrist"` (exists but `is_active: false`).
- **Expected Result:** First passes; second and third are rejected — since the column is a free string with no DB-level FK, this validation must live in the service layer or the schema gains an actual foreign key.

### TC-CLIN-UNIT-002 — Email format validator matches the frontend's existing regex intent
- **Priority:** Medium
- **Steps:** Validate `"notanemail"` and `"dr.doe@clinic.com"`.
- **Expected Result:** First rejected with an "Invalid email format" equivalent, second accepted — matches `test-plan/clinicians-test-plan-done.md` TC-CLIN-009 (must NOT show "Required" when a malformed-but-present value is supplied — the two error states are distinct).

### TC-CLIN-UNIT-003 — Required-field validator rejects a blank email distinctly from a malformed one
- **Priority:** Medium
- **Steps:** Validate a clinician input with `email: ""`.
- **Expected Result:** Rejected with a "Required" error, not "Invalid format" — regression for the distinction drawn in TC-CLIN-010 vs TC-CLIN-009 in the existing QA plan.

### TC-CLIN-UNIT-004 — Consultation fee is stored and computed in paise, never float rupees
- **Priority:** Critical
- **Steps:** Validate a clinician's/product's fee input of `₹1500.50`.
- **Expected Result:** Internally represented as `150050` (paise, `Int`), never as a floating-point rupee value — per CLAUDE.md's India-specific money convention; the current mock UI displays a GBP `"£XX.XX per consultation"` fee badge (`TC-CLIN-018`), which is itself a currency mismatch the backend must not inherit — INR/paise is the only correct backend representation regardless of what the still-unlocalized frontend currently renders.

### TC-CLIN-UNIT-005 — Specialization/clinic filter-count helper matches the full unfiltered set, not the current view
- **Priority:** Low
- **Steps:** Given 8 clinicians (2 Cardiologists) and an active search filter that currently shows only 1 result, compute the "Cardiologist" dropdown count badge.
- **Expected Result:** Returns `2` (from the full list), not `1` (from the filtered view) — matches `test-result/clinicians-test-results.md` TC-CLIN-021's documented edge: "Counts reflect full unfiltered list, not current filtered view."

### TC-CLIN-UNIT-006 — Timeline block position/height calculation guards against invalid time strings
- **Priority:** High
- **Steps:** Call the dashboard's `getTopAndHeight(startTime, ...)` helper with a malformed `startTime` (e.g. `"not-a-time"`).
- **Expected Result:** Returns a safe fallback `{ top: 0, height: 36 }` rather than `NaN`/throwing — regression for `TC-CLDASH-19`/Edge E1 (`SUG-CLDASH-006`).

### TC-CLIN-UNIT-007 — Overlap-column assignment renders concurrent appointments side-by-side
- **Priority:** Medium
- **Steps:** Call `assignOverlapColumns()` with two appointments sharing the exact same start time and clinician.
- **Expected Result:** Both are assigned distinct, non-overlapping horizontal columns rather than stacking on top of each other — regression for `TC-CLDASH-20`/Edge E5 (`SUG-CLDASH-007`).

### TC-CLIN-UNIT-008 — "Today's progress" percentage is capped at 100 and hidden on zero appointments
- **Priority:** Low
- **Steps:** Compute the progress-bar width for `{completed: 6, total: 5}` (an inconsistent/impossible state) and for `{completed: 0, total: 0}`.
- **Expected Result:** First is clamped to `100` (`Math.min(100, ...)`), never rendering over-100% width; second returns "hidden" rather than `NaN%` — matches `NEW-CLDASH-019`'s documented edge cases.

### TC-CLIN-UNIT-009 — Duration-preview calculation returns null for a non-positive duration
- **Priority:** Low
- **Steps:** Compute the block-duration preview for `startTime=10:00, endTime=10:00` and for `startTime=10:00, endTime=09:00`.
- **Expected Result:** Both return `null`/"hidden" (duration ≤ 0), matching `TC-CLDASH-35`'s documented edge — an end time before or equal to the start time must never render a preview badge (nor be accepted by the underlying block-creation validation).

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-CLIN-API-001 — `clinicians` query returns only clinicians belonging to the calling org
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have their own clinics and clinicians assigned via `clinic_id`.
- **Steps:** Log in as an Org 1 manager, call `clinicians` (list query).
- **Expected Result:** Only Org 1's clinicians are returned — scoped via `Clinicians.clinic_id → Clinics.client_org_id`, since `Clinicians` itself carries no direct org identifier.

### TC-CLIN-API-002 — `createClinician` rejects an email already used by another clinician
- **Priority:** High
- **Preconditions:** A clinician with `email: "dr.doe@clinic.com"` already exists.
- **Steps:** Call `createClinician` with the same email.
- **Expected Result:** Rejected with a uniqueness-constraint error — matches `Clinicians.email @unique` in the schema.

### TC-CLIN-API-003 — `createClinician` requires a valid, existing, active `clinician_type`
- **Priority:** High
- **Steps:** Call `createClinician` with `clinician_type: "Not A Real Type"`.
- **Expected Result:** Rejected — the resolver must validate against `ClinicianTypeModel` (or the schema must add a real FK) rather than accept any string, closing the gap noted in the schema-fact callout above.

### TC-CLIN-API-004 — `clinicianLanguages` assignment prevents duplicate clinician+language pairs
- **Priority:** Medium
- **Steps:** Call the mutation that links a clinician to a language twice with the identical `clinician_id`/`language_id` pair.
- **Expected Result:** Second call is rejected or is a no-op — matches the `@@unique([clinician_id, language_id])` constraint on `ClinicianLanguages`.

### TC-CLIN-API-005 — Deleting a language cascades to remove its `ClinicianLanguages` links, not the clinician
- **Priority:** Medium
- **Steps:** Delete a `Languages` row that a clinician is currently linked to via `ClinicianLanguages`.
- **Expected Result:** The `ClinicianLanguages` join row is removed (`onDelete: Cascade` per schema); the `Clinicians` record itself is untouched.

### TC-CLIN-API-006 — Deactivating (not deleting) a clinician preserves their historical appointments
- **Priority:** High
- **Steps:** Call the toggle-active mutation to set `is_active: false` on a clinician with existing completed appointments, then query that clinician's appointment history.
- **Expected Result:** `is_active` flips to `false`; the clinician disappears from "available for new bookings" lists but their past `Appointments`/`Reviews` records remain fully intact and queryable.

### TC-CLIN-API-007 — A clinician's own `me`-scoped update cannot change their `clinic_id` or `clinician_type`
- **Priority:** Critical
- **Preconditions:** A clinician is logged in via their own account.
- **Steps:** Call a self-service "update my profile" mutation attempting to change `clinic_id` to a different clinic.
- **Expected Result:** Rejected or the field is silently ignored — only an admin/manager mutation (`updateClinician`) may reassign clinic/type; a clinician editing their own bio/languages must not be able to reassign themselves to another org's clinic.

### TC-CLIN-API-008 — Clinician dashboard's "today's appointments" query is scoped to the logged-in clinician only
- **Priority:** Critical
- **Preconditions:** Clinician C1 and Clinician C2 (same clinic) both have appointments scheduled today.
- **Steps:** Log in as C1, call the dashboard's today's-appointments query.
- **Expected Result:** Only C1's appointments are returned, never C2's — this is the backend contract behind the currently mock-only `/clinician/dashboard` (`MOCK_APPOINTMENTS`), which has never been tested against a real multi-clinician scenario since it runs off a single hardcoded array regardless of which demo clinician account is used.

### TC-CLIN-API-009 — `markAppointmentComplete` only transitions from `scheduled`, not from `cancelled`
- **Priority:** High
- **Steps:** Call the mark-complete mutation on an appointment currently in `cancelled` status.
- **Expected Result:** Rejected with an invalid-state-transition error — matches the frontend's own gating rule (`SUG-CLDASH-011`: "Button only rendered when `selectedAppt.status === 'scheduled'`"), now enforced server-side rather than just hidden in the UI.

### TC-CLIN-API-010 — Row-level scoping: a clinician cannot fetch another clinician's full record via `clinician(id)`
- **Priority:** Medium
- **Preconditions:** Two clinicians, C1 and C2, exist in the same clinic.
- **Steps:** Log in as C1 (clinician role, not manager/admin), query `clinician(id: <C2.id>)`.
- **Expected Result:** Either rejected, or returns only the subset of fields a patient-facing "book with this doctor" view would show (name, specialty, public bio) — never C2's email/phone/internal fields. Distinguish this from admin/manager access, which should see full records.

### TC-CLIN-API-011 — `createSpacerBlock`/lunch-break mutations reject overlapping time ranges for the same clinician
- **Priority:** High
- **Steps:** Create a spacer block `10:00–11:00` for a clinician, then attempt to create a second spacer block `10:30–11:30` for the same clinician on the same day.
- **Expected Result:** Rejected (or flagged) as an overlap — the frontend's `assignOverlapColumns()` (`SUG-CLDASH-007`) only handles *visual* overlap of pre-existing data; it does not validate on creation. The backend must own this rule since nothing today prevents a clinician from creating two contradictory blocks.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-CLIN-E2E-001 — Manager creates a clinician and the clinician can immediately log in
- **Priority:** Critical
- **Steps:** As a manager, create a clinician with a fresh email + temp password (or invite flow), log out, log in as that new clinician.
- **Expected Result:** Login succeeds and lands on `/clinician/dashboard` — proves `createClinician` actually provisions a usable account, not just a `Clinicians` row disconnected from `UserProfiles`.

### TC-CLIN-E2E-002 — Editing a clinician's specialization is reflected on their public detail page
- **Priority:** High
- **Steps:** As a manager, edit a clinician's `clinician_type` from "General Practitioner" to "Pediatrics", save, then view that clinician's detail page.
- **Expected Result:** Detail page shows "Pediatrics" — regression for `TC-CLIN-012`, now against a persisted backend record instead of `MockStore.updateClinician()`.

### TC-CLIN-E2E-003 — A clinician's dashboard only ever shows their own day, never another clinician's
- **Priority:** Critical
- **Preconditions:** Two clinicians at the same clinic each have distinct appointments scheduled for today.
- **Steps:** Log in as Clinician A, note the KPI counts and timeline; log out; log in as Clinician B.
- **Expected Result:** Clinician B sees a completely different set of appointments/KPI counts corresponding only to their own schedule — this is the real-backend acceptance bar for the currently single-mock-array `/clinician/dashboard`.

### TC-CLIN-E2E-004 — Marking an appointment complete from the dashboard updates KPIs, timeline, and queue together
- **Priority:** High
- **Steps:** As a clinician, open an appointment's detail drawer, click "Mark Complete".
- **Expected Result:** The "Completed" KPI count increments, the timeline block's color changes to the completed color, the appointment is removed from the "Upcoming Queue", and the change survives a page reload (persisted, not just `localStatusOverrides` local state as in the current mock implementation per `SUG-CLDASH-011`).

### TC-CLIN-E2E-005 — Adding a time block via the dashboard persists across reload and blocks new bookings in that slot
- **Priority:** High
- **Steps:** As a clinician, use "Add Block" to block out 14:00–15:00, save, reload the dashboard, then attempt to book an appointment for that clinician at 14:30 from the booking wizard (a different user/session).
- **Expected Result:** The block still appears on the timeline after reload, and the 14:00–15:00 slot is unavailable in the booking wizard's slot picker — real-backend equivalent of `SUG-CLDASH-013`'s currently mock-only `createSpacerBlock`.

### TC-CLIN-E2E-006 — Deactivating a clinician removes them from future booking availability but not from past records
- **Priority:** High
- **Steps:** As a manager, toggle a clinician's status to inactive; as a patient, attempt to book a new appointment with that clinician; as an admin, view a past completed appointment involving that clinician.
- **Expected Result:** The clinician no longer appears as bookable; the past appointment record still correctly displays the (now-inactive) clinician's name and details.

### TC-CLIN-E2E-007 — A clinician's own login only ever grants access to their own portal pages, never the admin clinicians list
- **Priority:** Critical
- **Steps:** Log in as a clinician, attempt direct navigation to `/clinicians` (the admin management list).
- **Expected Result:** Blocked / redirected to a 403 page — consistent with `TC-CLIN-013`'s existing assertion ("No admin/manager sections accessible") now verified against a real role guard rather than mock routing alone.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### Clinicians List / Detail / Create / Edit (Admin)

### TC-CLIN-FE-001 — Combined 4-dimension filter uses AND logic across search, specialization, clinic, and status
- **Priority:** Medium
- **Steps:** Type "Vega" in search AND select Specialization = "Cardiologist" AND set status = "Active".
- **Expected Result:** Only Dr. Carlos Vega is shown — regression for `TC-CLIN-019`/Edge E3 ("All 4 filters set simultaneously... AND logic — only exact match shown; no crashes").

### TC-CLIN-FE-002 — Inactive clinicians are visually dimmed, not just labeled
- **Priority:** Low
- **Steps:** View the clinicians list with the status filter set to "All" or "Inactive".
- **Expected Result:** The inactive clinician's card renders with `opacity: 0.70` and 30% grayscale, distinct from active cards — regression for `TC-CLIN-020`/`SUG-CLIN-013`.

### TC-CLIN-FE-003 — Filter dropdown option counts reflect the full list, not the current filtered view
- **Priority:** Low
- **Steps:** Apply a search filter that narrows the list to 1 result, then open the Specialization dropdown.
- **Expected Result:** "Cardiologist" still shows its true full-list count (e.g. "2"), not "1" — regression for `TC-CLIN-021`.

### TC-CLIN-FE-004 — "Clear Filters" only appears when a filter is active, and resets all four dimensions at once
- **Priority:** Medium
- **Steps:** Apply only a search term, verify the button appears; click it; verify search, specialization, clinic, and status all reset simultaneously.
- **Expected Result:** Button hidden with no filters active, visible with any one filter active, and clicking it clears all four together — regression for `TC-CLIN-022`/`SUG-CLIN-015`.

### TC-CLIN-FE-005 — Availability heatmap tooltips show full day names, including for inactive/grey days
- **Priority:** Low
- **Steps:** Hover over each day chip in a clinician card's availability heatmap, including a day the clinician is NOT available.
- **Expected Result:** Tooltip shows the full day name (e.g. "Wednesday"), not an abbreviation — for both active and inactive/grey day chips. Regression for `TC-CLIN-023`.

### TC-CLIN-FE-006 — Create-clinician form distinguishes "Required" from "Invalid format" on the Email field
- **Priority:** High
- **Steps:** Submit the create form with Email left blank; separately, submit with Email set to `"notanemail"`.
- **Expected Result:** First shows "Required"; second shows "Invalid email format" — these are two distinct error states, and the form must not collapse them into one generic message (per `TC-CLIN-009`/`TC-CLIN-010`).

### TC-CLIN-FE-007 — Create form shows all required-field errors simultaneously on empty submit
- **Priority:** Medium
- **Steps:** Submit `/clinicians/new` with every field left blank.
- **Expected Result:** All required-field errors appear at once (name, email, specialization, etc.), not just the first one encountered — regression for Edge E8 ("Create form empty submit... All required field errors shown simultaneously").

### TC-CLIN-FE-008 — Edit form's three-tier data lookup resolves correctly when the backend is offline
- **Priority:** High
- **Steps:** With the backend simulated offline, navigate to `/clinicians/c1/edit`.
- **Expected Result:** The form pre-fills from the GraphQL → MockStore → `MOCK_EDIT_DATA` fallback chain without ever showing a blank/broken form — regression for `TC-CLIN-011`/Edge E6.

### TC-CLIN-FE-009 — Edit form save falls back to MockStore when the mutation fails offline
- **Priority:** Medium
- **Steps:** With the backend offline, change a field on the edit form and click "Save Changes".
- **Expected Result:** A `"Clinician updated (offline mode)"` snackbar appears, no crash, and `MockStore.updateClinician()` is invoked as the fallback path — regression for `TC-CLIN-012`/Edge E7.

### TC-CLIN-FE-010 — Clinician with no assigned services renders gracefully, not a crash
- **Priority:** Low
- **Steps:** View a clinician card/detail whose services list is empty.
- **Expected Result:** The services-chips section is simply absent/empty — no exception, no broken layout — regression for Edge E10.

### TC-CLIN-FE-011 — Clinician with no availability templates shows "Unavailable" for all 7 days
- **Priority:** Medium
- **Steps:** View the Schedule tab of a clinician detail page whose `availability_templates` is empty.
- **Expected Result:** All 7 days show "Unavailable" — no crash, no missing day rows — regression for Edge E11.

### Clinician Portal Dashboard (`/clinician/dashboard`)

### TC-CLIN-FE-012 — Header banner falls back gracefully when no clinician name is resolvable
- **Priority:** Medium
- **Steps:** Simulate a logged-in clinician user where `user?.clinician?.full_name` is undefined and `user?.name` is also undefined.
- **Expected Result:** Falls back to `"Dr. —"`, never the literal placeholder-looking `"Dr. Doctor"` — regression for `SUG-CLDASH-005`/`TC-CLDASH-03`.

### TC-CLIN-FE-013 — Timeline auto-scrolls to the current time on load, not always to 08:00
- **Priority:** Medium
- **Steps:** Mock the system clock to 14:00, load the dashboard.
- **Expected Result:** The scrollable timeline is scrolled so the current-time red line is visible near the top (`scrollTop = max(0, nowTop - 60)`), not showing 08:00 by default — regression for `TC-CLDASH-07B`.

### TC-CLIN-FE-014 — Appointment block product name visibility depends on rendered block height
- **Priority:** Low
- **Steps:** Compare a 30-minute appointment block against a 20-minute one on the timeline.
- **Expected Result:** The 30-minute block (height 36px > 30px threshold) shows the product/service name; the 20-minute block (height 24px) hides it to avoid text overflow — regression for `TC-CLDASH-08C`.

### TC-CLIN-FE-015 — "Join Video Call" only appears for video-type appointments, never in-person ones
- **Priority:** High
- **Steps:** Open the detail drawer for an in-person appointment, then for a video appointment.
- **Expected Result:** In-person shows only "View Notes"; video shows both "View Notes" and "Join Video Call"/"Start Session" — regression for `TC-CLDASH-09C`/`TC-CLDASH-12C`.

### TC-CLIN-FE-016 — Upcoming Queue is capped at exactly 4 patients even with more available
- **Priority:** Low
- **Steps:** Seed 6+ upcoming appointments in mock data, load the dashboard.
- **Expected Result:** Exactly 4 queue items render, never a 5th — regression for `TC-CLDASH-14B`.

### TC-CLIN-FE-017 — All appointments cancelled today shows the correct empty states, not a crash
- **Priority:** Medium
- **Steps:** Seed mock data where every appointment for today is `cancelled`.
- **Expected Result:** "Upcoming Next" shows "No more appointments today.", the queue shows "Queue is empty.", and no KPI/timeline computation throws — regression for Edge E3.

### TC-CLIN-FE-018 — All timeline times render in 12-hour format everywhere, never 24-hour
- **Priority:** Medium
- **Steps:** Check the hour-grid labels, an appointment block's top-right time, its hover tooltip, its detail-drawer body, and the "Upcoming Queue" secondary text, focused on a PM-hour appointment (e.g. 14:30).
- **Expected Result:** All five surfaces show `"2:30 PM"` — never `"14:30"` anywhere. Regression across `TC-CLDASH-21` through `TC-CLDASH-25` plus Edge E8, which collectively caught this as a real, previously-inconsistent formatting bug across multiple UI surfaces.

### TC-CLIN-FE-019 — Marking complete updates the KPI progress bar immediately, without reload
- **Priority:** Medium
- **Steps:** Note the "Today's Progress" bar (e.g. "1 / 5 completed", 20% width), mark one more appointment complete via the detail drawer.
- **Expected Result:** The bar animates to "2 / 5 completed" (40% width) immediately — regression for `NEW-CLDASH-019` combined with `SUG-CLDASH-011`'s status-override wiring.

### TC-CLIN-FE-020 — Locally-added blocks can be deleted from the timeline; pre-existing server blocks cannot
- **Priority:** Medium
- **Steps:** Add a new time block via the "Add Block" drawer, then attempt to delete both it and a pre-existing mock spacer block (e.g. "Morning admin") from the timeline.
- **Expected Result:** The newly-added block shows a "×" delete control and is removed instantly on click; the pre-existing "Morning admin" block shows no delete control at all — regression for `TC-CLDASH-34`.

### TC-CLIN-FE-021 — Add Block drawer shows a live duration preview and blocks invalid ranges
- **Priority:** Low
- **Steps:** In the "Add Block" drawer, enter Start 10:00 / End 11:30, then change End to 09:00 (before Start).
- **Expected Result:** First combination shows "Duration: 1h 30m"; second hides the preview entirely (and the Save button should not allow submitting an end time before the start time) — regression for `TC-CLDASH-35`.

### TC-CLIN-FE-022 — Auto-refresh interval is cleaned up on unmount, not left running after navigation
- **Priority:** Low
- **Steps:** Load the dashboard, navigate away to another page, then use browser dev tools (or a timer-mock assertion) to confirm no further refetch fires from the unmounted component.
- **Expected Result:** `clearInterval()` fires on unmount — no duplicate/orphaned 60-second refresh timers accumulate across repeated navigation — regression for `TC-CLDASH-16B`.
