# Availability & Scheduling — Test Cases

**Domain covers:** clinician availability templates (recurrence, valid periods, room assignment), lunch breaks, spacer blocks (clinician-scoped), room blocks (manager-side "Blocks" feature), the clinician calendar view, and the slot-generation algorithm that merges all of the above with existing appointments into bookable time.
**Grounded in:** `test-plan/manager/manager-availability-test-plan.md`, `manager-blocks-test-plan.md` (and their `16-03-2026-not-done/` predecessor versions), `test-plan/clinician-portal/clinician-availability-test-plan-done.md`, plus their `test-result/`/`test-suggestion/` counterparts (`manager-availability-test-results.md`, `manager-blocks-test-results.md`, `clinician-availability-test-results.md`, `clinician-calendar-test-results.md`, and the matching `test-suggestion/` files), `context/backend-implementation-plan.md` Phase 5, `schema.prisma` (`ClinicianAvailability`, `LunchBreaks`, `SpacerBlocks`, `RoomBlocks`).
**Known gap flagged by this research:** none of the existing QA docs exercise an actual slot-computation engine — every prior test pass has scoped to CRUD/UI correctness against static mock data. There is no prior precedent for how availability + lunch breaks + spacer blocks + room blocks + existing appointments combine into bookable slots, buffer time, or service-duration handling. The Unit/API/E2E sections' algorithm-focused cases below are therefore derived from `backend-implementation-plan.md` Phase 5 and `schema.prisma`, not from QA history — this is the core scheduling engine the backend plan calls out to "get under test before anything depends on it." Cross-clinic/cross-room conflict handling (a room double-booked by two different clinicians' availability, or a manager's Room Block silently colliding with an existing clinician availability template) is likewise undocumented anywhere and is treated the same way.

---

## 1. Unit Test Cases

### TC-AVAIL-UNIT-001 — Recurrence-type/day-of-week pairing is enforced
- **Priority:** High
- **Steps:** Build an availability record with `recurrence_type: 'weekly'` and no `day_of_week`; then one with `recurrence_type: 'daily'` and a `day_of_week` set.
- **Expected Result:** Weekly without a day is rejected (or defaulted, per implementation choice, but must not silently create an unusable "weekly on no day" record); daily explicitly ignores/nulls `day_of_week` on save — matches `day_of_week` being visible/selectable "only when recurrence = weekly" (TC-MGR-AVAIL-07).

### TC-AVAIL-UNIT-002 — Custom-dates format validator matches the frontend's exact rule
- **Priority:** Medium
- **Steps:** Validate `"2026-04-01, 2026-04-15"`, `"04/01/2026"`, and `""`.
- **Expected Result:** First accepted; second rejected with the exact message **"Custom dates must be in YYYY-MM-DD format, separated by commas (e.g. 2026-04-01, 2026-04-15)."** (TC-MGR-AVAIL-08); empty string is sent as `null` and not validated (Edge E6) — the backend validator should mirror this exact leniency, not newly reject empty as an error.

### TC-AVAIL-UNIT-003 — Shared end-before-start validator rejects `start >= end`
- **Priority:** Critical
- **Steps:** Validate `start: "09:00", end: "09:00"` and `start: "10:00", end: "09:00"`.
- **Expected Result:** Both rejected with "End time must be after start time" — this exact rule/message is independently required by Availability (TC-MGR-AVAIL-23/24), Blocks (`validateTimes`, TC-MGR-BLK-23/24/25), and Lunch Breaks (Edge E6) — one shared validator should back all three call sites.

### TC-AVAIL-UNIT-004 — Valid-Until-before-Valid-From validator matches the frontend's exact copy
- **Priority:** High
- **Steps:** Validate `valid_from: "2026-06-01", valid_until: "2026-05-01"`.
- **Expected Result:** Rejected with the exact message **`"Valid Until" cannot be before "Valid From".`** (TC-MGR-AVAIL-25/SUG-AVAIL-006). Note the predecessor plan explicitly documented this as *not yet enforced* ("No front-end validation; backend should reject it") before the fix — this unit test is the backend's half of that same guarantee, and must hold even if a future frontend regression removes its own client-side check.

### TC-AVAIL-UNIT-005 — `exclude_weekends` is true only when both Saturday and Sunday are excluded
- **Priority:** Medium
- **Steps:** Set `exclude_saturday: true, exclude_sunday: true`; then flip `exclude_saturday` to `false` while `exclude_sunday` stays `true`.
- **Expected Result:** First state → `exclude_weekends: true`. Second state → `exclude_weekends: false` even though Sunday alone is still excluded — matches TC-MGR-AVAIL-12/13's exact derivation logic (master flag requires BOTH days, not either).

### TC-AVAIL-UNIT-006 — Same-clinician overlap detector warns, does not block
- **Priority:** Medium
- **Steps:** Check a new slot 09:00–17:00 (Mon) against an existing slot 08:00–12:00 (Mon) for the same clinician.
- **Expected Result:** Detected as an overlap, but the function's return value is advisory (a warning payload), not a rejection — mirrors `findOverlap()`'s non-blocking design (TC-CLAVAIL-27/33): Save must remain enabled even when this function reports a conflict.

### TC-AVAIL-UNIT-007 — 12-hour time formatter edge cases
- **Priority:** Low
- **Steps:** Format `'00:00'`, `'12:00'`, `'23:59'`, `''`, `null`.
- **Expected Result:** `'00:00'` → "12:00 AM", `'12:00'` → "12:00 PM", `'23:59'` → "11:59 PM", `''`/`null` → `''` (no crash) — exact cases from `fmt12`'s documented edge-case table (SUG-BLK-PLAN-004).

### TC-AVAIL-UNIT-008 — Duration-badge formatter hides the badge on non-positive duration
- **Priority:** Low
- **Steps:** Compute duration for `09:00–17:00` (whole hours), `09:00–13:30` (partial), and `09:00–09:00` (zero).
- **Expected Result:** "8h", "4h 30m", and `null` (badge hidden) respectively — matches `formatDuration()`'s documented behavior (TC-CLAVAIL-39, NEW-CLAVAIL-014): `totalMins <= 0` must hide the badge, not render "0h" or a negative value.

### TC-AVAIL-UNIT-009 — Room requirement differs by block type
- **Priority:** High
- **Steps:** Validate a Room Block with no `room_id`; validate a Spacer Block with no `room_id`.
- **Expected Result:** Room Block is rejected (room is required — TC-MGR-BLK-17); Spacer Block is accepted (room is optional — TC-MGR-BLK-11) — this distinction is the defining difference between the two block types and must be enforced identically in the backend validator, not just the frontend form's `required` attribute.

### TC-AVAIL-UNIT-010 — Slot generator subtracts a lunch break from the middle of an availability window
- **Priority:** Critical
- **Preconditions:** One `ClinicianAvailability` template 09:00–17:00 (Mon), one `LunchBreaks` row 13:00–14:00 (Mon), same clinician.
- **Steps:** Generate bookable ranges for that Monday.
- **Expected Result:** Two contiguous ranges result: 09:00–13:00 and 14:00–17:00 — not one solid 09:00–17:00 range (lunch not subtracted) and not zero ranges (lunch subtracted the whole day by mistake). This is the core case the backend plan singles out as needing to be "under test before anything depends on it."

### TC-AVAIL-UNIT-011 — Slot generator also subtracts SpacerBlocks and RoomBlocks intersecting the request
- **Priority:** Critical
- **Preconditions:** Same availability template as TC-AVAIL-UNIT-010, plus a `SpacerBlocks` row 10:00–10:30 for the same clinician, plus a `RoomBlocks` row 15:00–15:30 for the room the template is assigned to.
- **Expected Result:** The 10:00–10:30 and 15:00–15:30 windows are also excluded from the generated ranges, on top of the lunch-break subtraction — proves all four exclusion sources (lunch, spacer, room block, existing appointments — see next case) compose correctly rather than only the first one found being applied.

### TC-AVAIL-UNIT-012 — Slot generator respects service duration + buffer, not just raw open time
- **Priority:** High
- **Steps:** Generate slots for a 45-minute service against an open window of exactly 30 minutes, then against a 60-minute open window.
- **Expected Result:** No slot is offered in the 30-minute window (too short to fit the service + any configured buffer); at least one slot is offered in the 60-minute window — per `backend-implementation-plan.md` Phase 5's explicit requirement to "respect service duration + buffer time."

### TC-AVAIL-UNIT-013 — Slot generator honors `valid_from`/`valid_until` bounds even when the weekday matches
- **Priority:** High
- **Preconditions:** A weekly Monday template with `valid_from: 2026-06-01`, `valid_until: 2026-06-30`.
- **Steps:** Generate slots for a Monday in May 2026 and a Monday in July 2026.
- **Expected Result:** Both return zero slots — the day-of-week match alone is not sufficient; the requested date must also fall inside `[valid_from, valid_until]`.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-AVAIL-API-001 — `AVAILABLE_SLOTS(clinician_id, date, service_id)` returns the fully merged result
- **Priority:** Critical
- **Preconditions:** A clinician has an availability template, a lunch break, a spacer block, and one existing confirmed appointment all on the requested date.
- **Steps:** Call `AVAILABLE_SLOTS`.
- **Expected Result:** Returned slots exclude all four exclusion sources and match the exact contract shape the frontend's booking wizard already expects (`frontend-contract-analysis.md §2`) — this is the resolver-level expression of TC-AVAIL-UNIT-010/011.

### TC-AVAIL-API-002 — Overlapping availability records are allowed but surfaced with a signal
- **Priority:** Medium
- **Steps:** Create two overlapping `ClinicianAvailability` records for the same clinician via the mutation.
- **Expected Result:** Both are created (matches the frontend's warn-not-block UX, TC-CLAVAIL-27) but the mutation response includes a warning/conflict field — the backend must not silently accept it with zero signal, since a client integrating fresh against this API has no other way to know an overlap exists.

### TC-AVAIL-API-003 — A RoomBlock zeroes out slots for a clinician whose availability already claims that room
- **Priority:** Critical
- **Preconditions:** Clinician C1's availability template assigns Room 3C, 09:00–17:00 daily. No RoomBlock exists yet.
- **Steps:** Manager creates a RoomBlock for Room 3C, 10:00–11:00, then call `AVAILABLE_SLOTS(C1, that date, ...)`.
- **Expected Result:** The 10:00–11:00 window is absent from C1's available slots afterward — the RoomBlock creation itself is not rejected (rooms can legitimately need maintenance blocks independent of who's scheduled), but it must actually take effect against slot generation. This exact cross-feature interaction is flagged in the research as never having been tested anywhere in existing QA history.

### TC-AVAIL-API-004 — Overlapping RoomBlocks on the same room are prevented at the database layer
- **Priority:** High
- **Steps:** Fire two concurrent `createRoomBlock` calls for the same `room_id` with overlapping time ranges.
- **Expected Result:** Exactly one succeeds — mirrors the Appointments-domain double-booking exclusion-constraint approach (`TC-APPT-API-003`) applied to blocks, since two overlapping "this room is blocked" records are a data-integrity error, not just a UX nicety.

### TC-AVAIL-API-005 — Cross-clinic isolation on availability/block mutations
- **Priority:** Critical
- **Preconditions:** Manager M1 is scoped to Clinic A; Clinic B belongs to a different org or a different clinic under the same org.
- **Steps:** As M1, attempt to create/edit/delete a `ClinicianAvailability`, `SpacerBlocks`, or `RoomBlocks` record whose `clinic_id` is Clinic B's.
- **Expected Result:** All three rejected — no client-side check exists for this today (the manager Availability/Blocks pages don't scope by clinic access at all in the current mock layer), so this is purely a server-side guarantee.

### TC-AVAIL-API-006 — Deleting an availability template with future booked appointments against it is rejected
- **Priority:** High
- **Preconditions:** A `ClinicianAvailability` record has at least one future `Appointments` row that was booked against its generated slots.
- **Steps:** Call `deleteAvailability` on that record.
- **Expected Result:** Rejected (or requires an explicit force/cascade flag that the caller must opt into) — silently deleting the template must not orphan or silently cancel the dependent appointment. No existing QA doc covers this interaction; it's a forward-looking rule derived from the Phase 5/Phase 7 boundary.

### TC-AVAIL-API-007 — Lunch-break mutations are distinct from availability mutations and are excluded from slot generation identically
- **Priority:** Medium
- **Steps:** Call `saveLunchBreak`/`deleteLunchBreak` (not `saveAvailability`/`deleteAvailability`) to create then remove a lunch break, checking `AVAILABLE_SLOTS` after each step.
- **Expected Result:** Creating the lunch break removes its window from generated slots; deleting it restores that window — matches the frontend's separate mutation pair for lunch breaks vs. slots.

### TC-AVAIL-API-008 — Custom recurrence with zero selected days is rejected server-side
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-BLK-011 — the frontend currently allows submitting `recurrence_days: []` for `recurrence_type: 'custom'` with no guard.
- **Steps:** Call the block-creation mutation with `recurrence_type: 'custom', recurrence_days: []`.
- **Expected Result:** Rejected — per the project's established pattern (frontend has no enforcement today, the backend must be the real enforcement point, same as the double-booking and cancellation-fee cases in the Appointments domain).

### TC-AVAIL-API-009 — A recurring block's `end_date` in the past is rejected server-side
- **Priority:** Low
- **Preconditions:** Grounded in SUG-BLK-010 — same "frontend doesn't guard this yet" pattern.
- **Steps:** Call the block-creation mutation with `recurrence_type: 'daily', end_date: <yesterday>`.
- **Expected Result:** Rejected with a clear validation error.

### TC-AVAIL-API-010 — A full-day RoomBlock returns an empty (not erroring) slot list
- **Priority:** Medium
- **Steps:** Create a RoomBlock covering an entire day for a room, then call `AVAILABLE_SLOTS` for a clinician assigned to that room on that date.
- **Expected Result:** Returns an empty array cleanly — must not throw or return `null` when zero slots remain after exclusion.

### TC-AVAIL-API-011 — Row-level ownership on availability mutations
- **Priority:** Critical
- **Preconditions:** Clinician C1 and C2 both exist.
- **Steps:** Log in as C1, attempt to edit/delete a `ClinicianAvailability` or `LunchBreaks` record belonging to C2.
- **Expected Result:** Rejected — mirrors `TC-AUTH-API-009`'s row-level-scoping pattern applied to the clinician's own schedule; a `staff`-role token must not be able to mutate a clinician's template either, unless explicitly acting on that clinician's behalf via a manager-level permission.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-AVAIL-E2E-001 — A new weekly template immediately produces matching patient-facing slots
- **Priority:** Critical
- **Steps:** Manager creates a weekly Monday 09:00–17:00 availability template for a clinician. Patient opens the booking wizard and selects that clinician for the next Monday.
- **Expected Result:** Slots matching the template appear in the wizard without any manual cache-busting step.

### TC-AVAIL-E2E-002 — Adding a lunch break splits the live slot grid
- **Priority:** High
- **Steps:** With the template from E2E-001 already live and bookable, the clinician adds a 13:00–14:00 lunch break for that same Monday.
- **Expected Result:** The patient-facing slot grid for that day immediately shows two ranges around the lunch break (09:00–13:00, 14:00–17:00) instead of one continuous range — end-to-end expression of TC-AVAIL-UNIT-010.

### TC-AVAIL-E2E-003 — A Room Block removes slots for any clinician mapped to that room, without touching their template
- **Priority:** High
- **Steps:** Manager creates a Room Block for Room 3C, 10:00–11:00. Patient attempts to book Clinician C1 (assigned to Room 3C) at 10:15.
- **Expected Result:** That slot is unavailable in the wizard; C1's own availability template is untouched and still shows correctly outside the blocked window (Clinician Availability page shows no change) — end-to-end expression of TC-AVAIL-API-003.

### TC-AVAIL-E2E-004 — A Spacer Block affects only the targeted clinician, not clinic-mates sharing the room
- **Priority:** High
- **Preconditions:** Clinicians C1 and C2 both have templates assigned to the same room.
- **Steps:** Manager creates a Spacer Block for C1 only, covering an hour. Patient attempts to book C1 and, separately, C2 during that hour.
- **Expected Result:** C1 shows no slots in that window; C2's slots for the same room/hour are unaffected — proves Spacer Blocks are clinician-scoped, not room-scoped like Room Blocks.

### TC-AVAIL-E2E-005 — Custom-date availability only produces slots on the exact listed dates
- **Priority:** Medium
- **Steps:** Manager creates an availability record with `recurrence_type: custom`, custom dates `"2026-04-01, 2026-04-15"`. Patient checks the booking wizard for 2026-04-01, 2026-04-08, and 2026-04-15.
- **Expected Result:** Slots appear only for 04-01 and 04-15; 04-08 (an unlisted date, even if the day-of-week matches) shows none.

### TC-AVAIL-E2E-006 — Shortening `valid_until` to the past immediately removes future slots
- **Priority:** Medium
- **Steps:** Edit an active-and-currently-bookable availability record's `valid_until` to yesterday's date.
- **Expected Result:** All of that template's future slots disappear from the patient wizard immediately — no separate "deactivate" step is needed, and no stale cached slots remain bookable.

### TC-AVAIL-E2E-007 — The clinician's own calendar reflects a manager-created Room Block as a visually distinct, non-clickable event
- **Priority:** Medium
- **Steps:** Manager creates a Room Block overlapping a clinician's scheduled week. Clinician opens `/clinician/calendar` for that week.
- **Expected Result:** The block renders in the documented grey/"block" color, is positioned correctly in the time grid, and clicking it does **not** open a patient-style detail card (matches TC-CLCAL-13's break/block click-guard) — it should visually coexist with the clinician's real appointments without being mistaken for one.

### TC-AVAIL-E2E-008 — Deleting a template with a booked future appointment doesn't silently orphan it
- **Priority:** High
- **Steps:** With a booked future appointment generated against a specific availability template, attempt to delete that template.
- **Expected Result:** The delete is rejected (or requires explicit confirmation naming the affected appointment) and the appointment remains intact and correctly scheduled — end-to-end expression of TC-AVAIL-API-006.

### TC-AVAIL-E2E-009 — Switching Blocks tabs mid-form discards the unsaved draft
- **Priority:** Low
- **Preconditions:** Regression guard for GAP-BLK-004 (fixed) — the predecessor plan explicitly documented the opposite, buggy behavior (form persisted across tab switch).
- **Steps:** Open the "Create Spacer Block" form, partially fill it, switch to the "Room Blocks" tab.
- **Expected Result:** The Spacer Block form closes/resets; switching back to Spacer Blocks does not restore the half-filled draft.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass today, independent of backend readiness, unless explicitly marked as a documented open gap.*

### TC-AVAIL-FE-001 — Custom-dates format is validated before submit, with the exact error copy
- **Priority:** Medium
- **Preconditions:** Regression guard for BUG-AVAIL-005/SUG-AVAIL-008.
- **Steps:** Select "Custom" recurrence in the Manager Availability form, enter `"04/01/2026"` in Custom Dates, attempt Save.
- **Expected Result:** Blocked with the exact message "Custom dates must be in YYYY-MM-DD format, separated by commas (e.g. 2026-04-01, 2026-04-15)."

### TC-AVAIL-FE-002 — "Exclude Weekends" checkbox cascade behaves exactly as specified
- **Priority:** Medium
- **Preconditions:** Regression guard for TC-MGR-AVAIL-12/13.
- **Steps:** Check "Exclude Weekends (Sat & Sun)"; then uncheck only the Saturday sub-checkbox.
- **Expected Result:** First action auto-checks both Saturday and Sunday sub-checkboxes and sets the master flag true; second action sets `exclude_weekends` back to false while Sunday remains checked.

### TC-AVAIL-FE-003 — Changing Clinic resets the Room dropdown
- **Priority:** Medium
- **Preconditions:** Regression guard for BUG-AVAIL-003.
- **Steps:** In the Manager Availability form, select a Clinic and a Room, then change the Clinic.
- **Expected Result:** Room resets to empty and the dropdown reloads with the new clinic's rooms — the previously selected room from the old clinic must not remain silently selected.

### TC-AVAIL-FE-004 — "Valid Period" column renders per the three documented states
- **Priority:** Low
- **Steps:** View three availability rows: one with neither `valid_from` nor `valid_until` set, one with only `valid_from`, one with both.
- **Expected Result:** "Always active," "From {date}," and "{from} → {until}" respectively.

### TC-AVAIL-FE-005 — The Availability form resets to defaults every time it's freshly opened
- **Priority:** Medium
- **Preconditions:** Regression guard for SUG-AVAIL-013 — the predecessor plan documented the form staying open in a stale state after navigating away and back.
- **Steps:** Open the form, change several fields, close without saving, navigate to another page and back, reopen the form.
- **Expected Result:** Form shows defaults (Weekly, 09:00–17:00, Exclude Weekends unchecked) — no leftover state from the earlier session.

### TC-AVAIL-FE-006 — Room requirement differs between Spacer and Room blocks in the UI
- **Priority:** High
- **Steps:** Attempt to submit a Room Block with no room selected; attempt to submit a Spacer Block with no room selected.
- **Expected Result:** Room Block submit is blocked (required field); Spacer Block submits successfully with no room — matches TC-MGR-BLK-11/17's documented distinction.

### TC-AVAIL-FE-007 — Reason field enforces a live 500-character counter
- **Priority:** Low
- **Steps:** Type into the Reason field on either block form and watch the counter as it approaches and reaches 500 characters.
- **Expected Result:** Counter reads "X / 500" live; input is hard-capped at 500 characters (`maxLength`), matching TC-MGR-BLK-26.

### TC-AVAIL-FE-008 — Custom Days block with zero days selected is currently accepted (documented open gap)
- **Priority:** Low
- **Preconditions:** Grounded in SUG-BLK-011, **PENDING** — mark as an expected-fail/known-gap test, not a regression guard.
- **Steps:** Select "Custom Days" recurrence on a block form, select no day chips, submit.
- **Expected Result (current/documented behavior):** Submission succeeds with `recurrence_days: []`. Re-verify this as *failing* (submit should be blocked) once SUG-BLK-011 ships.

### TC-AVAIL-FE-009 — No overlap warning exists anywhere in the Blocks feature (documented open gap)
- **Priority:** Low
- **Preconditions:** Grounded in the older manager-blocks-suggestion.md's SUG-BLK-009 ("Show Conflict Warning When Blocks Overlap") — explicitly noted as not implemented and not in the test plan.
- **Steps:** Create two Spacer Blocks for the same clinician, same clinic, and the exact same time window.
- **Expected Result (current/documented behavior):** Both are created silently with no warning shown — contrast this explicitly with TC-AVAIL-FE-010 below, where the Availability page DOES warn on overlap; the Blocks feature currently does not have the equivalent check at all.

### TC-AVAIL-FE-010 — Clinician Availability drawer warns (non-blocking) on overlap, but hard-blocks on an invalid date range
- **Priority:** High
- **Preconditions:** Regression guard distinguishing TC-CLAVAIL-27/33 (warn) from TC-CLAVAIL-26 (block).
- **Steps:** (a) Create a new slot overlapping an existing one for the same clinician. (b) Separately, set Valid Until before Valid From on the same drawer.
- **Expected Result:** (a) A yellow warning shows the exact conflicting slot's times ("Overlaps with existing slot 09:00–17:00 (Mon). You can still save."), and Save remains enabled. (b) A red error shows and Save is disabled — the two failure modes must not be conflated into the same UI treatment.

### TC-AVAIL-FE-011 — Day-selector choice survives a recurrence-type round trip
- **Priority:** Medium
- **Preconditions:** Regression guard for SUG-CLAVAIL-013.
- **Steps:** In the Clinician Availability drawer, select "Tu" under Weekly recurrence, switch to Daily, switch back to Weekly.
- **Expected Result:** "Tu" is still selected — `day_of_week` is preserved across recurrence-type switches even while the day selector itself is hidden for non-Weekly types.

### TC-AVAIL-FE-012 — Lunch breaks are distinguished from slots by an explicit type field, not an ID heuristic
- **Priority:** Medium
- **Preconditions:** Regression guard for the ISSUE-S3-003 fix (previously used an unreliable `id.includes('lunch')` heuristic).
- **Steps:** Render the clinician's weekly grid with a mix of slots and lunch breaks whose IDs don't follow any particular naming convention.
- **Expected Result:** Lunch breaks render amber, slots render blue, driven by each item's `_type` field — never misclassified due to ID string contents.

### TC-AVAIL-FE-013 — Overlapping same-time calendar events render side-by-side, not stacked or hidden
- **Priority:** Medium
- **Preconditions:** Regression guard for SUG-CLCAL-005/`assignOverlapColumns`.
- **Steps:** View the clinician calendar for a week containing two overlapping appointments for different patients (e.g. 10:00–10:30 and 10:06–10:36).
- **Expected Result:** Both render fully visible, side-by-side via fractional-width columns — neither event is hidden behind the other or silently dropped from view.

### TC-AVAIL-FE-014 — Week-navigation label handles negative offsets correctly
- **Priority:** Low
- **Preconditions:** Regression guard for BUG-CLCAL-004, which previously rendered the literal string "Week +-1".
- **Steps:** Navigate the clinician calendar to the previous week, and two weeks back.
- **Expected Result:** Labels read "Last Week" and "2 Weeks Ago" respectively — never a malformed "+-N" string.

### TC-AVAIL-FE-015 — Clicking a break or block event does not open a patient-style detail card
- **Priority:** Low
- **Preconditions:** Grounded in TC-CLCAL-13/13B.
- **Steps:** Click a lunch-break event and a block event on the clinician calendar.
- **Expected Result:** No detail card opens for either — only appointment events (in-person or video) open a detail card with patient info and a "View Patient"/"Join Call" action.
