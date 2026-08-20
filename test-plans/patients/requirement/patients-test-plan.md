---
id: TP026
type: test-plan
feature: patients
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR025, TS026]
---

# Patients — Test Plan (Updated v2.0)

**Feature area:** `/src/pages/patients/`
**Files:** `index.jsx`, `CreatePatientPage.jsx`, `EditPatientPage.jsx`, `detail.jsx`
**Routes tested:** `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit`
**GraphQL:** `PATIENTS_QUERY`, `CREATE_PATIENT_MUTATION`, `UPDATE_PATIENT_MUTATION`
**Validation:** Custom validate() in CreatePatientPage + zod/RHF in AddPatientDialog
**Mock data:** 15 mock patients (index.jsx), 20-entry MOCK_PATIENTS_DETAIL (detail.jsx), MOCK_EDIT_PATIENTS (EditPatientPage.jsx)
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 1. Patient List Page (`/patients`)

### TC-PAT-001 — List loads with 15 mock patients
**Steps:** Navigate to `/patients`.
**Expected:** Table renders 15 rows. Columns: Patient (avatar+name), Email, Phone, DOB, Gender, Actions. "Patients" h4 + count display. "Add Patient" blue gradient button.

---

### TC-PAT-002 — Search by name (debounced)
**Steps:** Type "Alice" in search field.
**Expected:** 300ms debounce. Only rows with "Alice" in full_name shown. Search icon visible. ClearIcon appears.

---

### TC-PAT-003 — Search clear button resets list
**Steps:** Type "bob"; click ClearIcon (×).
**Expected:** All 15 patients returned. Search field empty.

---

### TC-PAT-004 — A-Z alphabet filter
**Steps:** Click "A" chip; observe; click "All".
**Expected:** "A" → Alice Johnson only (teal chip highlight). "All" → all 15 patients.

---

### TC-PAT-005 — Gender toggle filter — Female
**Steps:** Click "Female" toggle button.
**Expected:** Only female patients shown. Toggle shows selected state.

---

### TC-PAT-006 — Gender + alphabet combined
**Steps:** Select "Male"; click "B".
**Expected:** Only male patients starting with "B" (Bob Smith).

---

### TC-PAT-007 — Click row → correct patient detail
**Steps:** Click "Alice Johnson" row.
**Expected:** Navigate to `/patients/1`. Detail shows Alice Johnson (not "John Michael Doe" default). *(Previously BUG-PAT-001 — now fixed)*

---

### TC-PAT-008 — Pagination controls
**Steps:** Change rows per page to 10.
**Expected:** 10 rows shown. "1–10 of 15" shown. Page navigation works.

---

### TC-PAT-009 — View Profile icon (stopPropagation)
**Steps:** Click OpenInNew icon in Actions column.
**Expected:** Navigate to `/patients/:id`. Row click NOT double-fired.

---

### TC-PAT-010 — Add Patient → /patients/new
**Steps:** Click "Add Patient" button.
**Expected:** Navigate to `/patients/new`. Create form loads.

---

### TC-PAT-011 — Loading skeleton
**Steps:** Observe brief loading state.
**Expected:** 8 skeleton rows (6-cell wide) shown while loading. Data loads after.

---

### TC-PAT-012 — Empty search result
**Steps:** Type "zzz" in search.
**Expected:** `No patients match "zzz"` in table. No rows.

---

### TC-PAT-013 — Error alert + Retry button
**Steps:** Backend returns non-null error.
**Expected:** "Backend unavailable — showing sample data" warning alert. "Retry" action button visible.

---

## 2. Create Patient (`/patients/new`)

### TC-PAT-014 — Form loads empty
**Steps:** Navigate to `/patients/new`.
**Expected:** "New Patient" h5, PersonAddIcon, all 8 fields empty. "Cancel" + "Save Patient" buttons.

---

### TC-PAT-015 — All required fields empty → errors
**Steps:** Click "Save Patient" without filling any fields.
**Expected:** Errors under First Name ("Required"), Last Name ("Required"), Email ("Required"), Phone ("Required").

---

### TC-PAT-016 — Invalid email format → error
**Steps:** Enter "notanemail"; fill First Name/Last Name/Phone; click Save.
**Expected:** "Invalid email address" shown under Email. Form not submitted.

---

### TC-PAT-017 — Valid submit (mock mode)
**Steps:** Fill all required fields with valid data; click Save Patient.
**Expected:** "Patient created (demo mode)" snackbar. Navigate to `/patients`.

---

### TC-PAT-018 — Optional fields (DOB, Gender) do not block save
**Steps:** Fill only required fields (First Name, Last Name, Email, Phone). Leave DOB + Gender empty.
**Expected:** No DOB/Gender errors. Form submits. Demo success snackbar.

---

### TC-PAT-019 — Cancel navigates back
**Steps:** Click "Cancel" on create form.
**Expected:** Navigate to `/patients`.

---

### TC-PAT-020 — Back arrow navigates back
**Steps:** Click ArrowBack IconButton.
**Expected:** Navigate to `/patients`.

---

## 3. Patient Detail (`/patients/:id`)

### TC-PAT-021 — Detail: correct patient for row ID
**Steps:** Navigate to `/patients/1`.
**Expected:** "Alice Johnson" rendered with correct data. *(BUG-PAT-001 fix verified)*

---

### TC-PAT-022 — Detail: row ID 10 (two-digit)
**Steps:** Navigate to `/patients/10`.
**Expected:** "Julia Roberts" rendered with Nuts allergy, A+ blood type, $75 balance.

---

### TC-PAT-023 — Detail: back button
**Steps:** Click "Back to Patients".
**Expected:** Navigate to `/patients`.

---

### TC-PAT-024 — Detail: hero action buttons
**Steps:** View hero header buttons.
**Expected:** "New Appointment" → `/appointments/new`. "Message" → `/messages`. "Edit Patient" → `/patients/:id/edit`.

---

### TC-PAT-025 — Detail: overview tab (default)
**Steps:** Default tab.
**Expected:** Personal info, contact, clinical notes, primary clinician sections visible.

---

### TC-PAT-026 — Detail: medical history tab
**Steps:** Click Medical History tab.
**Expected:** 4 timeline entries with date chip, clinician, service, notes.

---

### TC-PAT-027 — Detail: appointments tab
**Steps:** Click Appointments (4) tab.
**Expected:** Table: 4 rows. Status chips: confirmed/completed/cancelled/pending with icons.

---

### TC-PAT-028 — Detail: test results tab
**Steps:** Click Test Results tab.
**Expected:** 4 cards. Completed tests show "View Result" button. Allergy Panel shows "pending" chip.

---

### TC-PAT-029 — Detail: documents tab (empty state)
**Steps:** Click Documents tab.
**Expected:** "No documents yet" empty state. FolderIcon. "Upload Document" button.

---

### TC-PAT-030 — Detail: unknown ID → default fallback
**Steps:** Navigate to `/patients/99999`.
**Expected:** "John Michael Doe" default rendered. No crash.

---

## 4. Edit Patient (`/patients/:id/edit`)

### TC-PAT-031 — Edit: mock fallback load
**Steps:** Navigate to `/patients/1/edit` with backend offline.
**Expected:** Form pre-fills from MOCK_EDIT_PATIENTS['1']: Alice Johnson's data. No permanent skeleton.

---

### TC-PAT-032 — Edit: skeleton during fetch
**Steps:** Navigate with slow backend.
**Expected:** Two skeleton bars shown while fetching=true.

---

### TC-PAT-033 — Edit: validation — empty required fields
**Steps:** Clear First Name; click Save Changes.
**Expected:** "Required" error shown. Form not submitted.

---

### TC-PAT-034 — Edit: mock save (demo mode)
**Steps:** Change Phone; click Save Changes.
**Expected:** "Patient updated (demo mode)" snackbar. Navigate to `/patients/1`.

---

### TC-PAT-035 — Edit: cancel → detail page
**Steps:** Click Cancel.
**Expected:** Navigate to `/patients/1`.

---

### TC-PAT-036 — Edit: back arrow → detail
**Steps:** Click ArrowBack.
**Expected:** Navigate to `/patients/1`.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | Patient with no gender in list | '—' in gender cell |
| E2 | Patient with empty allergies array in detail | '' shown (join of []) |
| E3 | Two-digit IDs ('10', '11') in detail | Correct patient rendered from MOCK_PATIENTS_DETAIL |
| E4 | Unknown id in edit page | MOCK_EDIT_DEFAULT ("John Doe") seeded |
| E5 | Search empty string | All 15 patients shown |
| E6 | A-Z same letter twice | Toggles off (null) |
| E7 | Email "a@b" (minimal valid format) | Passes regex — accepted |
| E8 | Phone "123456" (6 chars) | Fails — "Enter valid phone number (min 7 chars)" |

---

## Total: 36 Test Cases + 8 Edge Cases
