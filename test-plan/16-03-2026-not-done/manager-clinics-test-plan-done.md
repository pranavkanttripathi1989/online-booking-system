# Manager Clinics (CRUD) — Detailed Test Plan

**Files:**
- `frontend/src/pages/manager/clinics/index.jsx`
- `frontend/src/pages/manager/clinics/create.jsx`
- `frontend/src/pages/manager/clinics/detail.jsx`
- `frontend/src/pages/manager/clinics/edit.jsx`

**Routes:** `/manager/clinics`, `/manager/clinics/new`, `/manager/clinics/:id`, `/manager/clinics/:id/edit`

---

## Feature Overview

Full CRUD module for clinics. The index page shows a Card grid for clinics and a Room tab, with live search filtering, KPI row, and a clinic-level delete. Create/Edit use Apollo mutations. Detail page pulls clinic + rooms via Apollo with a `network-only` policy.

---

## Test Cases — Index Page (`/manager/clinics`)

### TC-MGR-CLI-01 — Page Renders with Mock Clinic Data
**Steps:** Navigate to `/manager/clinics`.
**Expected:**
- Heading "Clinics & Rooms" shown.
- Subtitle shows "{n} clinics · {m} rooms total".
- 4 KPI cards: Total Clinics, Active Clinics, Total Clinicians, Today's Bookings.
- Clinic cards rendered in a 2-column grid.

---

### TC-MGR-CLI-02 — KPI Cards: Accurate Counts
**Steps:** View KPI row.
**Expected:**
- Total Clinics = 4 (mock).
- Active Clinics = 3 (1 inactive).
- Total Clinicians = sum of all `clinicians` fields = 4+6+3+2 = 15.
- Today's Bookings = 24+31+18+0 = 73.

---

### TC-MGR-CLI-03 — Clinic Card: Active vs Inactive Appearance
**Steps:** Compare the active and inactive clinic cards.
**Expected:**
- Active clinic chip: green background `#E6F4EA`, text `#137333`, label "active".
- Inactive clinic ("Westside Physio"): chip shows "inactive" in grey; card opacity is 0.65.

---

### TC-MGR-CLI-04 — Clinic Card: Detail Information
**Steps:** View any active clinic card.
**Expected:**
- Name, status chip, address (with location icon), phone (with phone icon), manager name (with person icon) all visible.
- Stats row shows: Clinicians | Rooms | Today | Monthly.
- Specialty chips rendered.

---

### TC-MGR-CLI-05 — Search: Filters Clinic Cards
**Steps:** Type "Central" in the search field.
**Expected:**
- Only "Central Medical Centre" shown.
- Other clinic cards hidden.
- Search is case-insensitive.

---

### TC-MGR-CLI-06 — Search: Clears Filter on Empty Input
**Steps:** Type then clear the search field.
**Expected:**
- All clinics reappear.

---

### TC-MGR-CLI-07 — Tab Switch: Clinics → Rooms
**Steps:** Click the "Rooms" chip tab.
**Expected:**
- Clinic cards hidden.
- Room cards grid rendered (ROOMS_DATA: 4 rooms).
- Each room card shows: name, clinic name, in-use/available chip, equipment chips, view/edit icons.

---

### TC-MGR-CLI-08 — Rooms Tab: Status Chip Colour
**Steps:** View room cards.
**Expected:**
- "In Use" rooms have a teal-ish border (`#006D77`) and badge.
- "Available" rooms have a grey border (`#E8EAED`) and green badge.

---

### TC-MGR-CLI-09 — Navigate to Create Clinic
**Steps:** Click "Add Clinic" button.
**Expected:**
- Navigates to `/manager/clinics/new`.

---

### TC-MGR-CLI-10 — Navigate to Clinic Detail
**Steps:** Click the view (eye) icon on a clinic card.
**Expected:**
- Navigates to `/manager/clinics/:id`.

---

### TC-MGR-CLI-11 — Navigate to Clinic Edit (from Index)
**Steps:** Click the edit (pencil) icon on a clinic card.
**Expected:**
- Navigates to `/manager/clinics/:id/edit`.

---

### TC-MGR-CLI-12 — Delete: Confirm Dialog Opens
**Steps:** Click the red delete icon on a clinic card.
**Expected:**
- `ConfirmDialog` opens with "Delete Clinic" title and message.

---

### TC-MGR-CLI-13 — Delete: Confirm Removes Card
**Steps:** Confirm deletion.
**Expected:**
- `setClinics` filters out the clinic with that ID.
- Clinic card disappears from UI (local state only — no backend mutation on index page).
- KPI counts update accordingly.

---

### TC-MGR-CLI-14 — Delete: Cancel Keeps Card
**Steps:** Open confirm dialog, click Cancel.
**Expected:**
- Dialog closes; card remains; all KPIs unchanged.

---

### TC-MGR-CLI-15 — Rooms Tab: Navigate to Room Detail
**Steps:** On Rooms tab, click the view icon on a room card.
**Expected:**
- Navigates to `/manager/rooms/:id`.

---

### TC-MGR-CLI-16 — Rooms Tab: Navigate to Room Edit
**Steps:** Click edit icon on a room card.
**Expected:**
- Navigates to `/manager/rooms/:id/edit`.

---

## Test Cases — Create Clinic (`/manager/clinics/new`)

### TC-MGR-CLI-17 — Page Load: Initial State
**Steps:** Navigate to `/manager/clinics/new`.
**Expected:**
- Page title "New Clinic".
- Form contains: Name*, Address, City, Postcode, Phone, Email, Timezone dropdown, Active/Inactive switch.
- Default timezone = "Europe/London".
- Default status = Active (switch on).
- Save button disabled only when loading.

---

### TC-MGR-CLI-18 — Validation: Name Required
**Steps:** Leave Name blank; click "Save Clinic".
**Expected:**
- `errors.name = 'Required'` shown under the Name field.
- No mutation fired.

---

### TC-MGR-CLI-19 — Create: Happy Path
**Steps:**
1. Fill Name = "Test Clinic", Address, City = "London", Postcode, Phone, Email, Timezone.
2. Click "Save Clinic".
**Expected:**
- `CREATE_CLINIC_MUTATION` fires with all fields.
- Loading spinner shown on Save button during mutation.
- On `onCompleted`: snackbar "Clinic created" shown; navigates to `/manager/clinics/:newId`.

---

### TC-MGR-CLI-20 — Create: Timezone Dropdown Options
**Steps:** Open the Timezone dropdown.
**Expected:**
- Contains all 9 timezone options (Europe/London, Europe/Paris, Europe/Berlin, America/New_York, America/Los_Angeles, Asia/Dubai, Asia/Karachi, Asia/Kolkata, Australia/Sydney).

---

### TC-MGR-CLI-21 — Create: Active/Inactive Toggle
**Steps:**
1. Toggle status switch Off (Inactive).
2. Click "Save Clinic".
**Expected:**
- `is_active: false` sent in mutation input.

---

### TC-MGR-CLI-22 — Create: Mutation Error (Network)
**Steps:** Mock mutation to throw error.
**Expected:**
- Snackbar shows error message (from `onError` handler).
- No navigation occurs.

---

### TC-MGR-CLI-23 — Create: Cancel Button
**Steps:** Click "Cancel".
**Expected:**
- Navigates back to `/manager/clinics`.
- No mutation fires.

---

### TC-MGR-CLI-24 — Create: Back Button (Arrow)
**Steps:** Click the back arrow icon.
**Expected:**
- Same as Cancel — navigates to `/manager/clinics`.

---

## Test Cases — Detail Page (`/manager/clinics/:id`)

### TC-MGR-CLI-25 — Page Load: Loading Skeleton
**Steps:** Navigate to `/manager/clinics/:id` before data loads.
**Expected:**
- Skeleton rectangle shown for header region.
- Three skeleton cards shown in the grid.

---

### TC-MGR-CLI-26 — Detail Page: Clinic Info Display
**Steps:** View an existing clinic detail page.
**Expected:**
- Header: clinic name + Active/Inactive chip + city name.
- Edit Clinic button visible.
- "Contact & Location" panel: address (combined), phone, email, timezone shown with appropriate icons.

---

### TC-MGR-CLI-27 — Detail Page: Rooms Section
**Steps:** View the Rooms panel.
**Expected:**
- Title shows "Rooms (N)".
- Each room listed with name, capacity, Active/Inactive chip, and Edit button.
- Room filter: `rooms.filter(r => r.clinic?.id === id)` (client-side).

---

### TC-MGR-CLI-28 — Detail Page: No Rooms Empty State
**Steps:** Navigate to a clinic with zero rooms.
**Expected:**
- "No rooms yet" message inside the Rooms panel.
- "+ Add Room" button visible and navigates to `/manager/rooms/new`.

---

### TC-MGR-CLI-29 — Detail: Navigate to Edit from Detail
**Steps:** Click "Edit Clinic" button.
**Expected:**
- Navigates to `/manager/clinics/:id/edit`.

---

### TC-MGR-CLI-30 — Detail: Room Edit Button
**Steps:** Click "Edit" on a room row in the rooms list.
**Expected:**
- Navigates to `/manager/rooms/:roomId/edit`.

---

## Test Cases — Edit Clinic (`/manager/clinics/:id/edit`)

### TC-MGR-CLI-31 — Edit: Loading Skeleton
**Steps:** Navigate to edit page before data loads.
**Expected:**
- Two skeleton blocks shown (header + form area).

---

### TC-MGR-CLI-32 — Edit: Pre-populates Form from Apollo
**Steps:** Navigate to `/manager/clinics/:id/edit`.
**Expected:**
- `useEffect` on `data` populates all form fields.
- `fetchPolicy: 'network-only'` ensures fresh data is fetched.
- Name, address, city, postcode, phone, email, timezone, is_active all pre-filled.

---

### TC-MGR-CLI-33 — Edit: Save Changes (Happy Path)
**Steps:**
1. Change clinic name to "Updated Clinic Name".
2. Click "Save Changes".
**Expected:**
- `UPDATE_CLINIC_MUTATION` fires with all form fields.
- On success: snackbar "Clinic updated"; navigates to `/manager/clinics/:id`.

---

### TC-MGR-CLI-34 — Edit: Toggle Status
**Steps:** Toggle Active/Inactive switch.
**Expected:**
- Label updates in real-time ("Active" green ↔ "Inactive" grey).
- Correct `is_active` value sent on save.

---

### TC-MGR-CLI-35 — Edit: Cancel Navigates to Detail
**Steps:** Click "Cancel".
**Expected:**
- Navigates back to `/manager/clinics/:id` without saving.

---

### TC-MGR-CLI-36 — Edit: Back Arrow Navigates to Detail
**Steps:** Click back arrow icon.
**Expected:**
- Navigates to `/manager/clinics/:id`.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | Search with no matches | Empty grid with no clinic cards visible |
| E2 | Clinic with no specialties | Specialty chips area is empty; no crash |
| E3 | Clinic with very long name | Card truncates or wraps; no layout break |
| E4 | Clinic with 0 clinicians, 0 rooms | Stats show 0; no crash |
| E5 | Name field = whitespace only on create | Trim check fails; "Required" error shown |
| E6 | Email with invalid format | No frontend email validation warning in create (Enhancement needed) |
| E7 | Invalid Clinic ID in URL on detail | Apollo returns null; page may show blank; needs 404 handling |
| E8 | Invalid Clinic ID in URL on edit | Skeleton loops permanently if `data.clinic` is null |
| E9 | Deleting last active clinic | KPI "Active Clinics" shows 0 |
| E10 | Room filter on rooms tab when 0 rooms | Empty rooms state; "No rooms found" message |
| E11 | Navigating to rooms tab and back | Clinics tab state preserved; search query retained |
