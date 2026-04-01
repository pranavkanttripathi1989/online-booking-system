# Patients Module — Test Plan (v1.0)

**Routes:** `/patients`, `/patients/:id`, `/patients/new`, `/patients/:id/edit`
**Files:** `index.jsx`, `detail.jsx`, `CreatePatientPage.jsx`, `EditPatientPage.jsx`
**Created:** 2026-03-31 (Session QA)

---

## Feature Overview

Patients module — 4 routes covering list, detail (tabbed), create, and edit flows. Full mock data layer in index.jsx and detail.jsx. EditPatientPage now has offline fallback. Apollo mutations with `catch` fallback in demo mode. Search, A-Z filter, gender filter, pagination in list.

---

## Test Cases — List Page (index.jsx)

### TC-PT-01 — Page Load: Patients List
**Steps:** Navigate to `/patients`.
**Expected:** "Patients" h4 + patient count. "Add Patient" button (blue gradient). Search bar, gender toggle (All/Male/Female), A-Z alphabet chips. Table with columns: Patient, Email, Phone, Date of Birth, Gender, Actions. 15 mock patients shown when backend offline.

---

### TC-PT-02 — Search by Name (Mock Mode)
**Steps:** Type "Alice" in search box.
**Expected:** Table filters to Alice Johnson. "× " clear icon shown in field. Count updates.

---

### TC-PT-03 — Search by Email (Mock Mode)
**Steps:** Type "carlos@email.com".
**Expected:** Carlos Reyes shown. All others hidden.

---

### TC-PT-04 — Clear Search
**Steps:** Search for "bob"; click ClearIcon (×) in search field.
**Expected:** Search cleared; all 15 patients shown.

---

### TC-PT-05 — A-Z Filter
**Steps:** Click "A" chip in alphabet row.
**Expected:** Only patients with full_name starting with "A" shown (Alice Johnson). All other rows hidden.

---

### TC-PT-06 — A-Z: Toggle Off
**Steps:** With "A" active, click "A" again.
**Expected:** Filter cleared; all patients visible.

---

### TC-PT-07 — A-Z: "All" Chip
**Steps:** Select "E" filter; then click "All" chip.
**Expected:** Filter cleared; all patients visible.

---

### TC-PT-08 — Gender Filter: Male
**Steps:** Click "Male" toggle button.
**Expected:** Table shows only male patients (Bob Smith, Carlos Reyes, Ethan Hunt, George Miller, Ivan Petrov, Kevin Chen, Michael Wang, Oscar Kim — 8 patients).

---

### TC-PT-09 — Gender Filter: Female
**Steps:** Click "Female" toggle button.
**Expected:** Table shows only female patients (8 patients).

---

### TC-PT-10 — Search + A-Z Combined
**Steps:** Type "a" in search; click "A" in alphabet.
**Expected:** Both filters applied — only patients matching search AND starting with A.

---

### TC-PT-11 — Empty State: No Results
**Steps:** Type "zzz" in search.
**Expected:** `No patients match "zzz"` shown in table. No rows.

---

### TC-PT-12 — Loading Skeleton
**Steps:** Simulate loading state.
**Expected:** 8 skeleton rows shown (each 6 cells wide), no real data.

---

### TC-PT-13 — Error Alert + Retry
**Steps:** Backend returns error.
**Expected:** "Backend unavailable — showing sample data" warning alert with "Retry" action button.

---

### TC-PT-14 — Add Patient Button → Navigate
**Steps:** Click "Add Patient" button.
**Expected:** Navigates to `/patients/new`.

---

### TC-PT-15 — Row Click → Detail Page
**Steps:** Click on any patient row.
**Expected:** Navigates to `/patients/:id`.

---

### TC-PT-16 — View Profile Icon Button
**Steps:** Click OpenInNew icon in Actions column.
**Expected:** Navigates to `/patients/:id`. `e.stopPropagation()` prevents double-navigation.

---

### TC-PT-17 — Edit Icon Button
**Steps:** Click Edit (✎) icon in Actions column.
**Expected:** Navigates to `/patients/:id/edit`. `e.stopPropagation()` prevents row click.

---

### TC-PT-18 — Pagination: Change Rows Per Page
**Steps:** Change rows per page from 25 to 10.
**Expected:** Max 10 rows shown; pagination controls update.

---

### TC-PT-19 — Gender Chip Colors
**Steps:** View gender column.
**Expected:** male → blueish (#EFF6FF/#1565C7); female → pink (#FDF2F8/#9D174D); other → green (#F0FDF4/#0B7B5C).

---

## Test Cases — Detail Page (detail.jsx)

### TC-PT-20 — Detail: Page Load for Known ID
**Steps:** Navigate to `/patients/1`.
**Expected:** "Alice Johnson" hero header. Status chip "active" (green). Avatar "AJ" (2 initials). Stats: 14 Visits, Last: 28/02/2026, $120 Balance (warning chip).

---

### TC-PT-21 — Detail: Back Button
**Steps:** Click "Back to Patients".
**Expected:** Navigates to `/patients`.

---

### TC-PT-22 — Detail: Hero Action Buttons
**Steps:** View hero card buttons.
**Expected:** "New Appointment" → `/appointments/new`. "Message" → `/messages`. "Edit Patient" → `/patients/1/edit`.

---

### TC-PT-23 — Detail: Overview Tab (Default)
**Steps:** Default tab loaded.
**Expected:** Personal Information section: DOB, Gender, Blood Type, Allergies. Contact: Phone, Email, Address, Emergency Contact. Clinical Notes: visible. Primary Clinician shown.

---

### TC-PT-24 — Detail: Unknown ID → Default Fallback
**Steps:** Navigate to `/patients/xyz`.
**Expected:** "John Michael Doe" default mock rendered. No crash.

---

### TC-PT-25 — Detail: Medical History Tab
**Steps:** Click "Medical History" tab.
**Expected:** 4 history entries with left blue border. Diagnosis, clinician, service, date chip, notes shown.

---

### TC-PT-26 — Detail: Appointments Tab
**Steps:** Click "Appointments (4)" tab.
**Expected:** Table with 4 rows. Columns: Date & Time, Clinician, Service, Status. Status chips with icons (confirmed=green, completed=blue, cancelled=red).

---

### TC-PT-27 — Detail: Test Results Tab
**Steps:** Click "Test Results" tab.
**Expected:** 4 cards. Completed tests show "View Result" button. Pending shows warning chip. "Allergy Panel" shows pending.

---

### TC-PT-28 — Detail: Documents Tab (Empty State)
**Steps:** Click "Documents" tab.
**Expected:** "No documents yet" empty state with FolderIcon. "Upload Document" button shown.

---

### TC-PT-29 — Detail: Outstanding Balance Chip
**Steps:** View patient with outstanding_balance > 0.
**Expected:** "$120 Balance" shown as warning chip in stats row. Patient with balance=0 (Sophie Turner) shows no warning chip.

---

## Test Cases — Create Page (CreatePatientPage.jsx)

### TC-PT-30 — Create: Page Load
**Steps:** Navigate to `/patients/new`.
**Expected:** "New Patient" h5 header, PersonAddIcon, "Cancel" + "Save Patient" buttons. 8-field form: First Name*, Last Name*, Email, Phone, DOB (date picker), Gender (select), Address, Clinical Notes.

---

### TC-PT-31 — Create: Validation — Empty Submit
**Steps:** Click "Save Patient" without filling any fields.
**Expected:** First Name and Last Name show red "Required" error. Form not submitted.

---

### TC-PT-32 — Create: Validation — First Name Only
**Steps:** Fill First Name, leave Last Name empty; click Save.
**Expected:** Last Name "Required" error. First Name cleared of error.

---

### TC-PT-33 — Create: Cancel Button
**Steps:** Click "Cancel".
**Expected:** Navigates back to `/patients`.

---

### TC-PT-34 — Create: Back Arrow Button
**Steps:** Click IconButton (ArrowBack).
**Expected:** Navigates back to `/patients`.

---

### TC-PT-35 — Create: Mock Submit (Backend Offline)
**Steps:** Fill First Name="Test", Last Name="User"; click Save Patient.
**Expected:** mutation fires; `catch` fallback triggers → no crash. (Mock: treat as success in demo mode.)

---

## Test Cases — Edit Page (EditPatientPage.jsx)

### TC-PT-36 — Edit: Mock Fallback Load (Backend Offline)
**Steps:** Navigate to `/patients/1/edit` with backend offline.
**Expected:** Form pre-filled from MOCK_EDIT_PATIENTS['1']: First Name="Alice", Last Name="Johnson", Email="alice@email.com", etc. No permanent skeleton.

---

### TC-PT-37 — Edit: Skeleton During Fetch
**Steps:** Navigate to `/patients/1/edit` with slow backend response.
**Expected:** Skeleton shown for header (56px) and form (400px) during fetching=true.

---

### TC-PT-38 — Edit: Validation
**Steps:** Clear First Name; click Save Changes.
**Expected:** First Name "Required" error. Form not submitted.

---

### TC-PT-39 — Edit: Cancel → Back to Detail
**Steps:** Click "Cancel".
**Expected:** Navigates to `/patients/1` (detail page of same patient).

---

### TC-PT-40 — Edit: Back Arrow
**Steps:** Click ArrowBack IconButton.
**Expected:** Navigates to `/patients/1` (detail page).

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | Patient with no gender in list | '—' shown in gender cell |
| E2 | Patient with no email in list | '—' shown in email cell |
| E3 | Patient with no DOB in list | '—' shown in DOB cell |
| E4 | Unknown patient ID in detail | MOCK_PATIENT_DEFAULT used — no crash |
| E5 | Empty allergies array in detail | allergies.join(', ') = '' → `—` via InfoRow |
| E6 | EditPatient backend offline | MOCK_EDIT_PATIENTS fallback loaded |
| E7 | Search empty string | All patients shown |
| E8 | A-Z: click same letter twice | Toggles off (null) |

---

## Feature Coverage

| Feature | File | Tested |
|---------|------|--------|
| Mock data fallback | index.jsx | TC-01 |
| Search (debounced) | index.jsx | TC-02–04 |
| A-Z filter | index.jsx | TC-05–07, 10 |
| Gender filter | index.jsx | TC-08–09 |
| Empty state | index.jsx | TC-11 |
| Loading skeleton | index.jsx | TC-12 |
| Error alert + Retry | index.jsx | TC-13 |
| Add Patient → /new | index.jsx | TC-14 |
| Row click + icon buttons | index.jsx | TC-15–17 |
| Pagination | index.jsx | TC-18 |
| Gender chip colors | index.jsx | TC-19 |
| Detail mock by URL id | detail.jsx | TC-20, 24 |
| Back button | detail.jsx | TC-21 |
| Hero buttons | detail.jsx | TC-22 |
| Overview tab | detail.jsx | TC-23 |
| Medical History tab | detail.jsx | TC-25 |
| Appointments tab | detail.jsx | TC-26 |
| Test Results tab | detail.jsx | TC-27 |
| Documents empty | detail.jsx | TC-28 |
| Balance chip | detail.jsx | TC-29 |
| Create form + validation | CreatePatientPage | TC-30–35 |
| Edit mock fallback | EditPatientPage | TC-36 |
| Edit skeleton/validation | EditPatientPage | TC-37–40 |

---

## Total: 40 Test Cases + 8 Edge Cases
