# Manager Clinics (CRUD) — Detailed Test Plan

**Files:**
- `frontend/src/pages/manager/clinics/index.jsx`
- `frontend/src/pages/manager/clinics/create.jsx`
- `frontend/src/pages/manager/clinics/detail.jsx`
- `frontend/src/pages/manager/clinics/edit.jsx`

**Routes:** `/manager/clinics`, `/manager/clinics/new`, `/manager/clinics/:id`, `/manager/clinics/:id/edit`  
**Last Updated:** 2026-03-30

---

## Feature Overview

Full CRUD module for clinics. Index page: Card grid + Rooms tab, live search, KPI row, local-state delete. Create/Edit use Apollo mutations. Detail page pulls clinic + rooms via `CLINIC_DETAIL_QUERY`. Edit page uses `MOCK_CLINIC_BY_ID` fallback when backend offline.

> **Mock Mode:** `CLINICS_DATA` / `ROOMS_DATA` hardcoded on index. Edit page: `MOCK_CLINIC_BY_ID` keyed by ID, `DEFAULT_MOCK_CLINIC` for unknown IDs. Fallback auto-applied when `data?.clinic` is null.

---

## Index Page (`/manager/clinics`)

### TC-MGR-CLI-01 — Page Renders with Mock Clinic Data
**Expected:** Heading "Clinics & Rooms", subtitle "{n} clinics · {m} rooms total", 4 KPI cards, clinic card grid.

---

### TC-MGR-CLI-02 — KPI Cards: Accurate Counts
**Expected:** Total=4, Active=3, Clinicians=15 (4+6+3+2), Today=73 (24+31+18+0).

---

### TC-MGR-CLI-03 — Clinic Card: Active vs Inactive Appearance
**Expected:** Active chip: #E6F4EA / #137333. Inactive (Westside Physio): grey chip, card opacity 0.65.

---

### TC-MGR-CLI-04 — Clinic Card: Detail Information
**Expected:** Name (bold), status chip, 📍 address, 📞 phone, 👤 Manager, stats row (Clinicians/Rooms/Today/Monthly), specialty chips.

---

### TC-MGR-CLI-05 — Search: Filters Clinic Cards
**Steps:** Type "Central".  
**Expected:** Only "Central Medical Centre" shown. Case-insensitive (`toLowerCase().includes`).

---

### TC-MGR-CLI-06 — Search: Clears Filter
**Steps:** Clear search field.  
**Expected:** All 4 clinic cards reappear.

---

### TC-MGR-CLI-07 — Tab Switch: Clinics → Rooms
**Steps:** Click "Rooms" chip tab.  
**Expected:** Clinic cards hidden. 4 room cards: name, clinic name, status chip (In Use/Available), equipment chips, view/edit icons.

---

### TC-MGR-CLI-08 — Rooms Tab: Status Chip Colour
**Expected:**
- In Use: border `#006D77` teal, chip teal (#E8F8F9 / #006D77).
- Available: border `#E8EAED` grey, chip green (#E6F4EA / #137333).

---

### TC-MGR-CLI-09 — Navigate to Create Clinic
**Expected:** "Add Clinic" → `/manager/clinics/new`.

---

### TC-MGR-CLI-10 — Navigate to Clinic Detail
**Expected:** View (eye) icon → `/manager/clinics/:id`.

---

### TC-MGR-CLI-11 — Navigate to Clinic Edit
**Expected:** Edit (pencil) icon → `/manager/clinics/:id/edit`.

---

### TC-MGR-CLI-12 — Delete: Confirm Dialog Opens
**Expected:** Trash icon → ConfirmDialog: title "Delete Clinic", message "Are you sure you want to delete this clinic? This cannot be undone."

---

### TC-MGR-CLI-13 — Delete: Confirm Removes Card
**Expected:** Card removed via `setClinics(prev => prev.filter(...))`. KPI counts update. (Local state — reload restores.)

---

### TC-MGR-CLI-14 — Delete: Cancel Keeps Card
**Expected:** Dialog closes; card remains; KPIs unchanged.

---

### TC-MGR-CLI-15 — Rooms Tab: Navigate to Room Detail
**Expected:** View icon → `/manager/rooms/:id`.

---

### TC-MGR-CLI-16 — Rooms Tab: Navigate to Room Edit
**Expected:** Edit icon → `/manager/rooms/:id/edit`.

---

### TC-MGR-CLI-37 — Subtitle: Rooms Total is Computed Sum *(new)*
**Steps:** View subtitle on index page.  
**Expected:** "{n} clinics · {computed_sum} rooms total" — e.g., "4 clinics · 20 rooms total" (5+8+4+3=20). **NOT** `ROOMS_DATA.length` (4).

---

### TC-MGR-CLI-38 — aria-labels on Clinic Card Icon Buttons *(new)*
**Expected:**
- View: `aria-label="View {clinic name}"`.
- Edit: `aria-label="Edit {clinic name}"`.
- Delete: `aria-label="Delete {clinic name}"`.

---

## Create Clinic (`/manager/clinics/new`)

### TC-MGR-CLI-17 — Create Page: Initial State
**Expected:** h5 "New Clinic". Fields: Name*, Address, City, Postcode, Phone, Email, Timezone=Europe/London, Status=Active. Save + Cancel in header.

---

### TC-MGR-CLI-18 — Validation: Name Required
**Steps:** Leave Name blank → click "Save Clinic".  
**Expected:** Red helperText "Required" below Name field. No mutation.

---

### TC-MGR-CLI-19 — Create: Happy Path
**Expected:** Fill all fields → mutation fires → snackbar "Clinic created" → `/manager/clinics/:newId`.

---

### TC-MGR-CLI-20 — Timezone Dropdown Options
**Expected:** 9 options: Europe/London, Europe/Paris, Europe/Berlin, America/New_York, America/Los_Angeles, Asia/Dubai, Asia/Karachi, Asia/Kolkata, Australia/Sydney.

---

### TC-MGR-CLI-21 — Create: Active/Inactive Toggle
**Expected:** Switch Off → "Inactive" (grey). Switch On → "Active" (green). `is_active` reflects state.

---

### TC-MGR-CLI-22 — Create: Mutation Error
**Expected:** `onError` → snackbar error message. No navigation.

---

### TC-MGR-CLI-23 — Cancel Button
**Expected:** Navigate to `/manager/clinics`. No mutation.

---

### TC-MGR-CLI-24 — Back Arrow
**Expected:** Navigate to `/manager/clinics`.

---

## Detail Page (`/manager/clinics/:id`)

### TC-MGR-CLI-25 — Loading Skeleton
**Expected:** Skeleton rectangle (h=56) + 3 skeleton cards (h=200) while `loading`.

---

### TC-MGR-CLI-26 — Clinic Info Display
**Expected:** Header: name + Active/Inactive chip + city. "Contact & Location" panel: address, phone, email, timezone with icons. Edit Clinic button.  
**Offline:** Header blank + chip "Inactive" (undefined is falsy) — graceful degradation, no crash.

---

### TC-MGR-CLI-27 — Rooms Section
**Expected:** "Rooms (N)" — list of rooms from `ROOMS_QUERY` filtered by `clinic_id`. Each: name, capacity, Active chip, Edit button.

---

### TC-MGR-CLI-28 — No Rooms Empty State
**Expected:** "No rooms yet" + "+ Add Room" button → `/manager/rooms/new`.

---

### TC-MGR-CLI-29 — Navigate to Edit from Detail
**Expected:** "Edit Clinic" button → `/manager/clinics/:id/edit`.

---

### TC-MGR-CLI-30 — Room Edit Button
**Expected:** Room "Edit" button → `/manager/rooms/:roomId/edit`.

---

## Edit Clinic (`/manager/clinics/:id/edit`)

### TC-MGR-CLI-31 — Loading Skeleton
**Expected:** 2 skeleton blocks (h=56 + h=400) while `fetching && !form`.

---

### TC-MGR-CLI-32 — Form Pre-populated (Offline Mock)
**Steps:** Navigate to `/manager/clinics/1/edit`.  
**Expected:**
- Page shows full form (NOT stuck on skeleton).
- Name: "City Heart Clinic", City: "London", Email: "info@cityheartclinic.co.uk", Timezone: "Europe/London", Status: Active.
- Source: `useEffect` uses `MOCK_CLINIC_BY_ID[id]` when `data?.clinic` is null.

---

### TC-MGR-CLI-33 — Save Changes
**Expected:** Mutation `UPDATE_CLINIC_MUTATION` fires with `{ id, input: form }`. Snackbar "Clinic updated". Navigate to `/manager/clinics/:id`.

---

### TC-MGR-CLI-34 — Toggle Status on Edit Page
**Expected:** Switch Off → "Inactive" (grey). Switch On → "Active" (green).

---

### TC-MGR-CLI-35 — Cancel Navigates to Detail
**Expected:** "Cancel" → `/manager/clinics/:id`.

---

### TC-MGR-CLI-36 — Back Arrow Navigates to Detail
**Expected:** Back arrow icon → `/manager/clinics/:id`.

---

### TC-MGR-CLI-39 — Mock Clinic Data for All 4 IDs *(new)*
**Steps:** Navigate to /manager/clinics/2/edit, /3/edit, /4/edit.  
**Expected:**
- ID 2 → "Central Medical Centre", Active.
- ID 3 → "Family Health Hub", Active.
- ID 4 → "Westside Physio & Sports", Inactive (switch Off).

---

### TC-MGR-CLI-40 — Unknown Clinic ID Falls Back Gracefully *(new)*
**Steps:** Navigate to `/manager/clinics/999/edit`.  
**Expected:** Form loads with `DEFAULT_MOCK_CLINIC` (name: "Unknown Clinic", all fields blank, timezone default, Active). No crash, no stuck skeleton.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | Search with no matches | Empty grid; no crash |
| E2 | Clinic with 3+ specialties | Chips wrap via `flexWrap="wrap"`; no overflow |
| E3 | Page reload after delete | All 4 clinics restored (useState re-init) |
| E4 | Clinic with 0 clinicians/rooms | Stats show 0; no crash |
| E5 | Name = whitespace only | `trim()` check → "Required" |
| E6 | Email invalid format | No frontend alert currently (SUG-CLI-006 pending) |
| E7 | Invalid clinic ID on detail | Apollo null → blank header, no crash |
| E8 | Invalid clinic ID on edit | **FIXED** — DEFAULT_MOCK_CLINIC fallback; form loads |
| E9 | Delete last active clinic | Active KPI = 0 |
| E10 | Rooms tab with 0 rooms | Empty — no empty state card yet (SUG-CLI-010 pending) |
| E11 | Tab switch with search active | Search preserved after Rooms→Clinics switch |
