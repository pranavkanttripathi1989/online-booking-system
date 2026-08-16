# Clinics & Rooms — Test Cases

**Domain covers:** Clinic CRUD (manager: list/detail/create/edit) and Room CRUD within a clinic (list/detail/create/edit, room types, clinician-type assignment).
**Grounded in:** `schema.prisma` (`Clinics`, `Rooms`, `RoomTypeModel`), `context/frontend-contract-analysis.md §2/§8`, and real QA history: `test-plan/manager/manager-clinics-test-plan.md`, `test-plan/manager/manager-rooms-test-plan.md`, `test-result/manager-clinics-test-results.md`, `test-result/manager-rooms-test-results.md`, `test-suggestion/manager-clinics-test-suggestion.md` + `manager-clinics-suggestion.md`, `test-suggestion/manager-rooms-test-suggestion.md`.
**Key schema facts worth designing around, not copying blindly from the frontend mock:**
1. `Clinics.address` is a **single free-text `String`**, and `Rooms` has **no `capacity` column at all** — yet the current frontend's Create/Edit Room forms have a "Capacity" number field (`TC-MGR-RM-18`/`TC-MGR-RM-21`) with no backing schema column. Either `Rooms` needs a `capacity: Int?` column added, or the backend contract must explicitly reject/ignore it — this must be resolved before `createRoom`/`updateRoom` resolvers are written, not discovered mid-implementation.
2. `Rooms.room_type` and `Rooms.clinician_type` are **plain strings** (`room_type` defaults to `"consultation"`), not foreign keys to `RoomTypeModel`/`ClinicianTypeModel` — same "string that should be an FK" pattern as `Clinicians.clinician_type` (see `06-clinicians/test-cases.md`). Validation must be enforced at the application layer.
3. Per CLAUDE.md, addresses should use the India-specific structured format `{line1, line2, city, state, pincode, country}` — the current mock UI's "Address / City / Postcode" as three separate flat strings (`TC-MGR-CLI-17`) is closer to this than a single blob, but still isn't the mandated JSON shape, and `Clinics.address` in the schema is a single string with no structured equivalent (unlike `Patients.address_structured`). This is a real schema gap for a domain (Clinics) that is arguably *more* important to get right for India-specific address/pincode handling than Patients, since clinic addresses appear on GST invoices.

---

## 1. Unit Test Cases

### TC-CLIROOM-UNIT-001 — Clinic address validator enforces the India structured shape
- **Priority:** Critical
- **Steps:** Validate `{line1: "14 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", country: "IN"}` and `{line1: "14 MG Road", city: "Bengaluru", pincode: "56A001"}` (non-numeric pincode, missing `state`).
- **Expected Result:** First passes; second is rejected — pincode must be exactly 6 numeric digits and `state` is required. This is new validation the backend needs since the schema currently has no structured equivalent for `Clinics` at all (unlike `Patients.address_structured`).

### TC-CLIROOM-UNIT-002 — `room_type` value must match an active `RoomTypeModel.name`
- **Priority:** High
- **Steps:** Validate `room_type: "Consultation Room"` (exists, active), `room_type: "Broom Closet"` (doesn't exist), `room_type: "Legacy Type"` (exists but `is_active: false`).
- **Expected Result:** First passes; second and third rejected — closes the schema gap noted above (currently a free string with no FK).

### TC-CLIROOM-UNIT-003 — `clinician_type` on a Room, when set, must match an active `ClinicianTypeModel.name`
- **Priority:** Medium
- **Steps:** Validate a room's optional `clinician_type: "Cardiologist"` (exists) vs `clinician_type: "Witch Doctor"` (doesn't exist) vs `clinician_type: null` (unset, since the field is optional).
- **Expected Result:** First passes, second rejected, third passes (field is nullable per schema — a room need not be restricted to one clinician type).

### TC-CLIROOM-UNIT-004 — Clinic name required-field validator matches the frontend's existing rule, including whitespace-only input
- **Priority:** Medium
- **Steps:** Validate `name: ""`, `name: "   "` (whitespace only), `name: "City Heart Clinic"`.
- **Expected Result:** First two rejected as "Required" (matches the frontend's `form.name.trim()` check, confirmed already-correct per `test-suggestion/manager-clinics-test-suggestion.md` SUG-CLI-007/E5), third accepted.

### TC-CLIROOM-UNIT-005 — Room capacity, if the column exists, rejects negative and zero values
- **Priority:** Medium
- **Steps:** Validate `capacity: -1`, `capacity: 0`, `capacity: 5`.
- **Expected Result:** First rejected outright; whether `0` is valid depends on the resolved schema design (schema-fact #1 above) — at minimum, negative capacity must never be accepted, matching the frontend's `inputProps={{ min: 0 }}` guard (`GAP-RM-002`/`E5` fix) and its stricter sibling suggestion (`SUG-RM-004`, recommending `min: 1`). This test should be finalized once the capacity-column decision is made.

### TC-CLIROOM-UNIT-006 — Rooms-per-clinic total is a true sum across all clinics, not a fixed sample size
- **Priority:** Medium
- **Steps:** Given 4 clinics with room counts `[5, 8, 4, 3]`, compute the "total rooms" figure.
- **Expected Result:** Returns `20` (the actual sum) — regression for `BUG-CLI-001`, where the frontend previously showed `ROOMS_DATA.length` (a hardcoded preview array of 4) instead of the real per-clinic sum, silently displaying wrong data to users.

### TC-CLIROOM-UNIT-007 — Email format validator applied consistently to Clinic contact email
- **Priority:** Medium
- **Steps:** Validate `"notanemail"` and `"info@cityheartclinic.co.uk"` for a clinic's contact email.
- **Expected Result:** First rejected, second accepted — closes a gap the frontend never actually implemented (`test-suggestion/manager-clinics-test-suggestion.md` SUG-CLI-003/SUG-CLI-006, both still PENDING at time of writing: "Invalid emails are silently accepted" on both Create and Edit clinic forms). This is genuinely new required behavior, not just a regression guard.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-CLIROOM-API-001 — `clinics` query returns only the calling org's clinics
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have their own clinics.
- **Steps:** Log in as an Org 1 manager, call `clinics` (list query).
- **Expected Result:** Only Org 1's clinics returned — scoped directly via `Clinics.client_org_id`, which (unlike `Patients`/`Clinicians`) is a real column on the table, so this should be a straightforward `WHERE` filter, not a join-derived one.

### TC-CLIROOM-API-002 — A manager cannot update or delete a clinic belonging to another org
- **Priority:** Critical
- **Preconditions:** Clinic A belongs to Org 1.
- **Steps:** Log in as an Org 2 manager, call `updateClinic(id: <ClinicA.id>, ...)` and separately `deleteClinic(id: <ClinicA.id>)`.
- **Expected Result:** Both rejected with FORBIDDEN/NOT_FOUND; a follow-up read confirms Clinic A is untouched.

### TC-CLIROOM-API-003 — `deleteClinic` is a real, persisted operation — not local-state-only
- **Priority:** Critical
- **Steps:** Call `deleteClinic` for a clinic with no rooms/appointments, then query `clinics` again.
- **Expected Result:** The clinic no longer appears. **This directly closes a known, explicitly documented frontend gap**: `test-suggestion/manager-clinics-test-suggestion.md` SUG-CLI-005/SUG-CLI-008 and `test-plan/manager/manager-clinics-test-plan.md` Edge E3/`TC-MGR-CLI-13` state the current delete button only calls `setClinics(prev => prev.filter(...))` — a page reload restores the "deleted" clinic because no `DELETE_CLINIC` mutation is ever called. The backend must make this real; treat "delete doesn't survive reload" as a bug to fix, not a behavior to replicate.

### TC-CLIROOM-API-004 — Deleting a clinic with active rooms and future appointments is rejected or requires cascading confirmation
- **Priority:** Critical
- **Preconditions:** A clinic has 2 active rooms and 1 future scheduled appointment.
- **Steps:** Call `deleteClinic` for that clinic.
- **Expected Result:** Rejected with a clear error (e.g. "Clinic has active rooms/appointments") rather than silently cascading and orphaning appointment/room records — this scenario is entirely untested in the current frontend QA history (delete there only ever removes a card from local state, never interacts with dependent rooms) and is new, critical spec for the backend.

### TC-CLIROOM-API-005 — `createRoom` requires a valid, active parent `clinic_id`
- **Priority:** High
- **Steps:** Call `createRoom` with a `clinic_id` that doesn't exist, then with one belonging to a different org than the caller.
- **Expected Result:** Both rejected — the first as a straightforward FK violation, the second as a cross-tenant violation (a manager must not be able to create a room under another org's clinic).

### TC-CLIROOM-API-006 — `roomsPaginated`/`rooms` query is scoped to the caller's org across all their clinics
- **Priority:** High
- **Preconditions:** Org 1 has 2 clinics with 5 and 8 rooms respectively; Org 2 has 1 clinic with 3 rooms.
- **Steps:** Log in as Org 1 manager, call the rooms list query with no clinic filter.
- **Expected Result:** Returns exactly 13 rooms (5+8), never Org 2's 3 — proves the join through `Rooms.clinic_id → Clinics.client_org_id` is applied even when no explicit `clinic_id` filter is passed.

### TC-CLIROOM-API-007 — `createRoom`/`updateRoom` reject an inactive clinic as the parent
- **Priority:** Medium
- **Steps:** Call `createRoom` with `clinic_id` pointing to a clinic where `is_active: false`.
- **Expected Result:** Rejected — matches the frontend's existing rule that the Clinic dropdown on the room create page only lists active clinics (`TC-MGR-RM-20`); the backend must enforce this itself rather than trust the client to only submit valid IDs.

### TC-CLIROOM-API-008 — `deleteRoom` is rejected (not silently ignored) when the room has upcoming appointments
- **Priority:** High
- **Steps:** Call `deleteRoom` for a room with a scheduled future appointment.
- **Expected Result:** Rejected with a "Room in use" style error — matches the pattern the frontend already anticipates and displays (`TC-MGR-RM-17`/Edge E12: "Delete Room: Backend Error... Room in use"), confirming the backend actually implements the check the UI has been ready to surface all along.

### TC-CLIROOM-API-009 — `createRoom` duplicate room-number-within-clinic is rejected
- **Priority:** Medium
- **Preconditions:** Clinic A already has a room numbered `"101"`.
- **Steps:** Call `createRoom` for Clinic A with `room_number: "101"` again.
- **Expected Result:** Rejected as a duplicate — matches the error case the frontend already displays generically (`TC-MGR-RM-10`: `"Duplicate room"` userError), now backed by a real uniqueness constraint scoped per-clinic (not global, since two different clinics may both have a "Room 101").

### TC-CLIROOM-API-010 — Clinic and room list/detail queries never leak another org's data through a direct-ID lookup
- **Priority:** Critical
- **Preconditions:** Room R1 belongs to a clinic in Org 2.
- **Steps:** Log in as an Org 1 manager, call `room(id: <R1.id>)` directly (bypassing the list query).
- **Expected Result:** Rejected or null — same principle as `TC-AUTH-API-010`, applied at the room level specifically, since the current frontend's detail page has no concept of this at all (its only fallback behavior tested is "invalid ID → mock placeholder", never "valid ID belonging to someone else").

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-CLIROOM-E2E-001 — Manager creates a clinic, then immediately adds a room to it
- **Priority:** Critical
- **Steps:** As a manager, create a new clinic via `/manager/clinics/new`, then from that clinic's detail page click "+ Add Room" and complete the room create form.
- **Expected Result:** The room is created and associated with the correct `clinic_id`; navigating back to the clinic detail page shows "Rooms (1)" with the new room listed — end-to-end proof that clinic creation and room creation are properly linked, not just independently mocked.

### TC-CLIROOM-E2E-002 — Deleting a clinic actually persists after reload
- **Priority:** Critical
- **Steps:** As a manager, delete a clinic with no rooms/appointments from `/manager/clinics`, then reload the page (full navigation, not SPA route change).
- **Expected Result:** The clinic remains deleted after reload — this is the real-backend acceptance bar that retires the currently-documented local-state-only limitation (`SUG-CLI-005`/`SUG-CLI-008`, Edge E3).

### TC-CLIROOM-E2E-003 — Attempting to delete a clinic with active rooms shows a clear blocking error, not a silent no-op
- **Priority:** High
- **Steps:** As a manager, attempt to delete a clinic that has 2 active rooms.
- **Expected Result:** An error message explains the clinic cannot be deleted while it has active rooms (or the UI offers a cascading-delete confirmation) — the clinic remains in the list either way; the user is never left wondering whether the delete "worked."

### TC-CLIROOM-E2E-004 — Editing a clinic's active/inactive status immediately affects room booking availability
- **Priority:** High
- **Steps:** As a manager, toggle a clinic to `Inactive` via the edit form, save; as a patient, attempt to book an appointment at that clinic.
- **Expected Result:** The now-inactive clinic no longer appears as a bookable option in the patient-facing booking wizard.

### TC-CLIROOM-E2E-005 — Room edit changes are reflected on the clinic's detail page without a full reload
- **Priority:** Medium
- **Steps:** From a clinic's detail page, click "Edit" on a listed room, change its room number, save, and return to the clinic detail page.
- **Expected Result:** The updated room number appears in the clinic's room list immediately (via refetch or cache update).

### TC-CLIROOM-E2E-006 — Invalid clinic/room IDs in the URL show a real "not found" state, not a blank page or infinite skeleton
- **Priority:** High
- **Steps:** Navigate directly to a clinic detail URL and a room detail URL, both with IDs that don't exist in the database.
- **Expected Result:** Both show a clear "not found" message with a way back to the list — this is the real-backend fix for two separately-documented frontend gaps: `SUG-CLI-004`/`SUG-CLI-011` (clinic detail currently renders a blank header with no "not found" messaging for an invalid ID) and `BUG-RM-002` (room edit page could strand a user in a permanent skeleton with no way to navigate back before the fix; now the resolver returning null/error should drive an explicit UI state, not another mock fallback).

### TC-CLIROOM-E2E-007 — Creating a room with a duplicate room number in the same clinic is rejected end-to-end
- **Priority:** Medium
- **Steps:** As a manager, create a room numbered "101" in Clinic A (already has one), submit.
- **Expected Result:** An inline/toast error surfaces the duplicate ("Duplicate room" or similar) and the form remains open with entered data intact — matches the error-handling path already anticipated by `TC-MGR-RM-10`, now against a real constraint instead of a mocked `userErrors` response.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### Clinics — Index / Create / Detail / Edit

### TC-CLIROOM-FE-001 — Rooms-total subtitle is a computed sum, not a hardcoded sample count
- **Priority:** Medium
- **Steps:** Load `/manager/clinics` with the standard 4-clinic mock dataset (room counts 5, 8, 4, 3).
- **Expected Result:** Subtitle reads `"4 clinics · 20 rooms total"`, never `"4 clinics · 4 rooms total"` — regression for `BUG-CLI-001`.

### TC-CLIROOM-FE-002 — Clinic edit form never gets permanently stuck on a skeleton when the backend is offline
- **Priority:** Critical
- **Steps:** With the backend offline, navigate to `/manager/clinics/1/edit`.
- **Expected Result:** The form renders fully populated ("City Heart Clinic", "London", etc.) via the `MOCK_CLINIC_BY_ID` fallback, never a stuck loading skeleton — regression for `BUG-CLI-002` (root cause: `fetchPolicy: 'network-only'` combined with no mock fallback left the page perpetually loading offline).

### TC-CLIROOM-FE-003 — Edit form resolves mock data correctly for every known clinic ID, and gracefully for unknown ones
- **Priority:** High
- **Steps:** Navigate to `/manager/clinics/2/edit`, `/3/edit`, `/4/edit`, and finally `/999/edit` (unknown) in turn.
- **Expected Result:** IDs 2/3/4 pre-fill with their correct respective clinic names and active/inactive states (ID 4, "Westside Physio & Sports", specifically shows the status switch OFF); ID 999 falls back to `DEFAULT_MOCK_CLINIC` ("Unknown Clinic", blank fields, switch ON) with no crash — regression for `TC-MGR-CLI-39`/`TC-MGR-CLI-40`.

### TC-CLIROOM-FE-004 — Delete confirmation dialog shows the correct copy and only removes the card on confirm
- **Priority:** Medium
- **Steps:** Click the delete (trash) icon on a clinic card, read the dialog, click "Cancel"; repeat and click confirm instead.
- **Expected Result:** Dialog title "Delete Clinic", message "Are you sure you want to delete this clinic? This cannot be undone."; Cancel leaves the card and KPI counts unchanged; Confirm removes the card and decrements the "Total"/"Active" KPI counts immediately — regression for `TC-MGR-CLI-12`/`13`/`14`. **Note:** per `SUG-CLI-005`, this delete is currently local-state-only (a reload restores the card) — that reload-restores-it behavior is itself the current, correct mock-mode assertion (see `TC-CLIROOM-E2E-002` for the real-backend acceptance bar that replaces it).

### TC-CLIROOM-FE-005 — Icon buttons on clinic cards carry descriptive `aria-label`s including the clinic name
- **Priority:** Low
- **Steps:** Inspect the View/Edit/Delete icon buttons on any clinic card.
- **Expected Result:** `aria-label="View {clinic name}"`, `aria-label="Edit {clinic name}"`, `aria-label="Delete {clinic name}"` respectively — regression for `TC-MGR-CLI-38`/`SUG-CLI-003`.

### TC-CLIROOM-FE-006 — Search and the Clinics/Rooms tab toggle interact correctly
- **Priority:** Medium
- **Steps:** Type a search term while on the Clinics tab, switch to the Rooms tab, then switch back to Clinics.
- **Expected Result:** The search term is preserved across the tab switch (documented current behavior, `Edge E11`/`TC-MGR-CLI-` — not cleared and not silently reapplied to Rooms in a confusing way); this test should be revisited if `SUG-CLI-008` (clearing search on tab switch) is ever implemented, since that would be a deliberate behavior change.

### TC-CLIROOM-FE-007 — Whitespace-only clinic name is rejected identically to a blank name
- **Priority:** Low
- **Steps:** Enter `"   "` (three spaces) into the Name field on `/manager/clinics/new`, submit.
- **Expected Result:** "Required" error shown — the existing `form.name.trim()` check already handles this correctly (confirmed already-passing per `SUG-CLI-007`); this test exists to prevent a future refactor from accidentally dropping the `.trim()`.

### TC-CLIROOM-FE-008 — Detail page degrades gracefully (not blank/crashed) when the backend returns no clinic data
- **Priority:** Medium
- **Steps:** With the backend offline, navigate to a clinic detail page.
- **Expected Result:** Header shows a blank name with an "Inactive" chip (falsy default) and an empty contact panel, but the page does not crash and the "Edit Clinic" button remains present and functional — this is the currently-accepted (if imperfect) offline behavior (`TC-MGR-CLI-26`); note `SUG-CLI-005`/`SUG-CLI-011` flag a real, still-pending gap (no explicit "not found"/error state) that should be closed per `TC-CLIROOM-E2E-006` once real data exists.

### Rooms — Index / Create / Detail / Edit

### TC-CLIROOM-FE-009 — Room detail page shows mock fallback data instead of a blank page on any Apollo network error
- **Priority:** Critical
- **Steps:** With the backend offline, navigate to any room detail URL (valid-looking but unresolvable ID).
- **Expected Result:** Renders "Room 1A", capacity "4 people", clinic "London Central Clinic", "Active" chip — never a blank white page. Regression for `BUG-RM-001` (root cause: the mock fallback `room ?? {...}` only triggered when `data.room` was explicitly `null`, but an Apollo network error left `data` entirely `undefined`, and the loading-skeleton guard was also skipped since `loading` had already become `false`).

### TC-CLIROOM-FE-010 — Room edit page's skeleton state still shows a working back button
- **Priority:** High
- **Steps:** With the backend offline, navigate to any room edit URL, observe the loading state.
- **Expected Result:** A header with "Edit Room" text and a back-arrow button is visible even during the skeleton/loading state, and clicking it navigates to `/manager/rooms` — regression for `BUG-RM-002` (previously the entire skeleton render replaced the header too, trapping the user with no way to navigate away except the browser's own Back button).

### TC-CLIROOM-FE-011 — Room index page shows mock room cards offline instead of an empty list
- **Priority:** High
- **Steps:** With the backend offline, navigate to `/manager/rooms`.
- **Expected Result:** 3 mock room cards render (Room 101/102/201, with 201 shown as Inactive) rather than an empty/blank list — regression for `GAP-RM-001`/`TC-MGR-RM-36`.

### TC-CLIROOM-FE-012 — Capacity field rejects negative values at the input level
- **Priority:** Medium
- **Steps:** On both the Create Room and Edit Room forms, attempt to enter `-1` into the Capacity field.
- **Expected Result:** The browser-enforced `min` constraint (`inputProps={{ min: 0 }}`) prevents the negative value from being submitted — regression for Edge E5/`GAP-RM-002`/`TC-MGR-RM-37`. **Note:** this test's exact acceptance boundary (min `0` vs. min `1`) should be revisited once the backend `capacity` column question (schema-fact #1) is resolved.

### TC-CLIROOM-FE-013 — Only one inline form (create or edit) is open at a time on the rooms index page
- **Priority:** Low
- **Steps:** Open the inline "Add Room" form, then click the edit icon on an existing room card without closing the add form first.
- **Expected Result:** The Add form closes and the Edit form opens in its place (single `showForm`/`editingRoom` state, never both simultaneously) — regression for Edge E7.

### TC-CLIROOM-FE-014 — Create Room form defaults the Clinic dropdown to active clinics only
- **Priority:** Medium
- **Steps:** Open the Clinic dropdown on `/manager/rooms/new` where at least one clinic is inactive.
- **Expected Result:** The inactive clinic does not appear as an option — regression for `TC-MGR-RM-20`.

### TC-CLIROOM-FE-015 — Delete Room confirmation dialog shows the correct copy
- **Priority:** Low
- **Steps:** Click the delete icon on a room card.
- **Expected Result:** Dialog title "Delete Room", message "Delete this room permanently? This cannot be undone." — regression for `SUG-RM-PLAN-002`.

### TC-CLIROOM-FE-016 — Room capacity submitted as blank is sent as `undefined`, never `0`
- **Priority:** Low
- **Steps:** On Create Room, fill only the required Name field and leave Capacity blank, submit.
- **Expected Result:** The mutation payload's `capacity` field is `undefined`/absent, not coerced to `0` — regression for `TC-MGR-RM-22`/Edge E4 (a room with an explicit capacity of 0 has a different meaning than "capacity not specified").

### TC-CLIROOM-FE-017 — Room with no clinic assigned shows a placeholder, not a crash, on the detail page
- **Priority:** Low
- **Steps:** View the detail page for a room whose `clinic` relation is null.
- **Expected Result:** The clinic field shows "—" — no exception, no blank crash — regression for Edge E10.

### TC-CLIROOM-FE-018 — Room number of unusual length or characters doesn't break the card layout
- **Priority:** Low
- **Steps:** View a room card whose `room_number` is an unusually long string (50+ characters).
- **Expected Result:** The room number is truncated with an ellipsis (`noWrap` + `maxWidth`) rather than overflowing the card — regression for `SUG-RM-006`/Edge E11 (documented as still-pending in the suggestion doc; this test should stay marked as a known gap until that fix lands).
