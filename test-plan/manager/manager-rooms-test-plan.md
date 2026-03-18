# Manager Rooms (CRUD) — Detailed Test Plan

**Files:**
- `frontend/src/pages/manager/rooms/index.jsx`
- `frontend/src/pages/manager/rooms/create.jsx`
- `frontend/src/pages/manager/rooms/detail.jsx`
- `frontend/src/pages/manager/rooms/edit.jsx`

**Routes:** `/manager/rooms`, `/manager/rooms/new`, `/manager/rooms/:id`, `/manager/rooms/:id/edit`

---

## Feature Overview

Full CRUD module for rooms. The index page uses a custom `usePagination` hook with a search bar and page navigation. It features an inline create/edit form (no separate create route in the index). Separate `/new` and `/:id/edit` routes exist as standalone pages. The detail page shows room info with a "Today's Schedule" placeholder.

---

## Test Cases — Index Page (`/manager/rooms`)

### TC-MGR-RM-01 — Page Load: Spinner, Then Grid
**Steps:** Navigate to `/manager/rooms`.
**Expected:**
- Spinner shown while data loads.
- After load: header "Rooms", subtitle "Manage clinic rooms and their types", "Add Room" button, pagination bar, and room cards rendered.

---

### TC-MGR-RM-02 — Room Cards: Data Display
**Steps:** Ensure multiple rooms exist.
**Expected:**
- Each card shows: room number (e.g., "Room 101"), room type name, clinic name, Active/Inactive chip.
- Active chip = green, Inactive chip = red.
- Hover → card elevation increases.

---

### TC-MGR-RM-03 — Search: Filters Results
**Steps:** Type a room number in the search field.
**Expected:**
- Only matching rooms shown.
- Pagination total updates accordingly.
- Search fires `loadData(0)` via `handleSearch`.

---

### TC-MGR-RM-04 — Search: Empty Results State
**Steps:** Search for a term that matches no rooms.
**Expected:**
- Room icon + "No rooms found. Try adjusting your search." message shown.
- No cards shown.

---

### TC-MGR-RM-05 — Pagination: Next/Previous
**Steps:** Create enough rooms to exceed 1 page; navigate pages.
**Expected:**
- "Next" button navigates to page 2.
- "Previous" returns to page 1.
- `PaginationBar` shows correct page info (e.g., "1–10 of 24").

---

### TC-MGR-RM-06 — Add Room Form: Toggle Open
**Steps:** Click "Add Room" on the index page.
**Expected:**
- Inline form appears with title "New Room".
- Fields: Clinic (required dropdown), Room Number (required), Room Type (required dropdown), Clinician Type (required dropdown).
- "Create" and "Cancel" buttons shown.

---

### TC-MGR-RM-07 — Add Room Form: Metadata Dropdowns Populated
**Steps:** Open the Add Room form.
**Expected:**
- Clinic dropdown lists all clinics from the `GET_METADATA` query.
- Room Type dropdown lists all room types.
- Clinician Type dropdown lists all clinician types.
- Default values pre-set to first options if available.

---

### TC-MGR-RM-08 — Create Room: Happy Path
**Steps:**
1. Select a Clinic.
2. Enter Room Number = "201".
3. Select Room Type.
4. Select Clinician Type.
5. Click "Create".
**Expected:**
- `CREATE_ROOM` mutation fires with `{ clinicId, roomNumber, roomType, clinicianType }`.
- Success message "Room created." shown.
- Form closes; list reloads from page 0.

---

### TC-MGR-RM-09 — Create Room: Required Fields Validation
**Steps:**
1. Leave Clinic empty.
2. Click "Create".
**Expected:**
- MUI required validation prevents submission.
- No mutation fires.

---

### TC-MGR-RM-10 — Create Room: Backend Error
**Steps:** Mock `CREATE_ROOM` to return `success: false, userErrors: [{message: "Duplicate room"}]`.
**Expected:**
- Error alert "Duplicate room" shown.
- Form stays open.

---

### TC-MGR-RM-11 — Edit Room: Pre-populate Form (Inline)
**Steps:** Click edit icon on a room card.
**Expected:**
- Inline form opens with title "Edit Room".
- Fields pre-filled: `clinicId`, `roomNumber`, `roomType`, `clinicianType`.
- Button says "Update" (not "Create").

---

### TC-MGR-RM-12 — Update Room: Happy Path
**Steps:**
1. Click edit on a room.
2. Change Room Number.
3. Click "Update".
**Expected:**
- `UPDATE_ROOM` mutation fires with the room's ID and updated form fields.
- "Room updated." success shown.
- Form closes; list reloads.

---

### TC-MGR-RM-13 — Edit Room: Cancel Resets Form
**Steps:** Open edit form; make changes; click "Cancel".
**Expected:**
- Form closes.
- `editingRoom` set to null.
- No mutation fires.

---

### TC-MGR-RM-14 — Delete Room: Confirm Dialog
**Steps:** Click the red delete icon on a room card.
**Expected:**
- `ConfirmDialog` opens with title "Delete Room" and warning message.

---

### TC-MGR-RM-15 — Delete Room: Confirm
**Steps:** Confirm deletion.
**Expected:**
- `DELETE_ROOM` mutation fires with correct ID.
- "Room deleted." success shown.
- List reloads from page 0.

---

### TC-MGR-RM-16 — Delete Room: Cancel
**Steps:** Open delete dialog; click Cancel.
**Expected:**
- Dialog closes; no mutation fires; card remains.

---

### TC-MGR-RM-17 — Delete Room: Backend Error
**Steps:** Mock `DELETE_ROOM` to return `success: false, userErrors: [{message: "Room in use"}]`.
**Expected:**
- Error alert "Room in use" shown.
- Room card remains.

---

---

## Test Cases — Create Room (`/manager/rooms/new`)

### TC-MGR-RM-18 — Page Load: Initial State
**Steps:** Navigate to `/manager/rooms/new`.
**Expected:**
- Page title "New Room", subtitle "Add a room to a clinic".
- Fields: Room Name*, Capacity (number), Clinic (select), Active switch.
- Default: Capacity blank, Clinic = "" (No clinic), Status = Active.

---

### TC-MGR-RM-19 — Validation: Name Required
**Steps:** Leave Name blank; click "Save Room".
**Expected:**
- `errors.name = 'Required'` validation shown.
- No mutation fires.

---

### TC-MGR-RM-20 — Create: Clinic Dropdown Shows Active Clinics Only
**Steps:** View the Clinic dropdown options.
**Expected:**
- Only clinics where `is_active = true` are shown.
- Inactive clinics excluded.

---

### TC-MGR-RM-21 — Create: Happy Path with Capacity
**Steps:**
1. Enter Name = "Room 301", Capacity = 4, select a Clinic.
2. Click "Save Room".
**Expected:**
- Mutation fires with `name`, `capacity: 4` (parsed int), `clinic_id`, `is_active: true`.
- On success: snackbar "Room created"; navigates to `/manager/rooms/:newId/edit`.

---

### TC-MGR-RM-22 — Create: Capacity Blank (Optional)
**Steps:** Leave Capacity blank; fill Name; click "Save Room".
**Expected:**
- `capacity` sent as `undefined` (not 0).
- Mutation succeeds.

---

### TC-MGR-RM-23 — Create: Cancel
**Steps:** Click "Cancel".
**Expected:** Navigates to `/manager/rooms`.

---

---

## Test Cases — Detail Page (`/manager/rooms/:id`)

### TC-MGR-RM-24 — Loading Skeleton
**Steps:** Navigate to detail page before data loads.
**Expected:**
- Two skeleton rectangles shown.

---

### TC-MGR-RM-25 — Detail: Data Display (Live Data)
**Steps:** Navigate to `/manager/rooms/:id` with backend running.
**Expected:**
- Room name + clinic name in header.
- Left panel: Capacity (with people icon), Clinic name, Active/Inactive chip.
- Edit Room button navigates to edit page.

---

### TC-MGR-RM-26 — Detail: Mock Fallback (Apollo 404)
**Steps:** Navigate to a room ID that doesn't exist.
**Expected:**
- Mock fallback renders: name "Room 1A", capacity 4, is_active true, clinic "London Central Clinic".
- No blank page / crash.

---

### TC-MGR-RM-27 — Detail: Today's Schedule Placeholder
**Steps:** View the right panel.
**Expected:**
- Title "Today's Schedule".
- Large room icon with text "No appointments in this room today".

---

### TC-MGR-RM-28 — Detail: Navigate to Edit
**Steps:** Click "Edit Room".
**Expected:**
- Navigates to `/manager/rooms/:id/edit`.

---

---

## Test Cases — Edit Room (`/manager/rooms/:id/edit`)

### TC-MGR-RM-29 — Edit: Loading Skeleton
**Steps:** Navigate before data loads.
**Expected:**
- Two skeletons shown.

---

### TC-MGR-RM-30 — Edit: Pre-populates Form
**Steps:** Navigate to edit page for existing room.
**Expected:**
- `useEffect` populates: `name`, `capacity` (as string), `clinic_id`, `is_active`.
- Clinic options filtered to active only.
- `fetchPolicy: 'network-only'` ensures fresh data.

---

### TC-MGR-RM-31 — Edit: Save Changes
**Steps:** Change capacity to 6; click "Save Changes".
**Expected:**
- `UPDATE_ROOM_MUTATION` fires with updated fields.
- `capacity` parsed as integer.
- On success: snackbar "Room updated"; navigates to `/manager/rooms`.

---

### TC-MGR-RM-32 — Edit: Toggle Active Status
**Steps:** Toggle status switch.
**Expected:**
- Label changes in real-time.
- Correct `is_active` sent on save.

---

### TC-MGR-RM-33 — Edit: Cancel
**Steps:** Click "Cancel".
**Expected:**
- Navigates back to `/manager/rooms`.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | No rooms in system | Index shows empty state card |
| E2 | Search matches 0 rooms after paginating | Returns to empty state; no crash |
| E3 | Room type/clinician type arrays empty in metadata | Dropdowns empty; form cannot be submitted without selection |
| E4 | Capacity = 0 | Sent as `undefined` (falsy); backend handles as null |
| E5 | Negative capacity entered | No frontend validation; backend may reject |
| E6 | Room number with special characters | Accepted as string; backend may validate |
| E7 | Editing and creating at same time (form state conflict) | Only one form open at a time (toggling closes other) |
| E8 | Invalid room ID in detail URL | Mock fallback renders |
| E9 | Invalid room ID in edit URL | Skeleton shown; if data.room is null, form never renders (infinite skeleton) |
| E10 | Room with no clinic assigned | Clinic cell shows "—" on detail page |
| E11 | Very long room number (50+ chars) | Card overflows; Enhancement: truncation needed |
| E12 | Deleting a room that's in-use | Backend should reject with userError; shown as alert |
