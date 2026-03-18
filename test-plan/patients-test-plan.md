# Patients — Test Plan

**Feature area:** `/src/pages/patients/`  
**Files:** `index.jsx`, `CreatePatientPage.jsx`, `EditPatientPage.jsx`, `detail.jsx`  
**Routes tested:** `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit`  
**GraphQL:** `PATIENTS_QUERY`, `CREATE_PATIENT_MUTATION`, `UPDATE_PATIENT_MUTATION`  
**Validation:** zod + react-hook-form  
**Mock data:** 15 mock patients in `index.jsx`

---

## 1. Patient List Page (`/patients`)

### TC-PAT-001 — List loads with 15 mock patients
**Prompt:**  
> Navigate to `http://localhost:3001/patients`.  
> Assert: table renders at least 15 rows with columns: Patient (avatar + name), Email, Phone, Date of Birth, Gender, Actions.

**Expected:** Mock fallback renders. Skeleton loaders shown briefly, then real/mock data appears.

---

### TC-PAT-002 — Search by name (debounced)
**Prompt:**  
> On `/patients`, type "Alice" in the search field.  
> Assert: within 400ms, table filters to show only rows where the patient name contains "Alice". Rows without "Alice" disappear.

**Expected:** 300ms debounce. `debouncedSearch` triggers re-filter. Search icon shows spinner briefly.

---

### TC-PAT-003 — Search clear button resets list
**Prompt:**  
> Type "bob" in the search field. Click the clear (X) button that appears at the right of the search field.  
> Assert: all patients return. Search field is empty.

**Expected:** `ClearIcon` button visible when search has content. Clicking clears `search` state.

---

### TC-PAT-004 — A-Z alphabet filter
**Prompt:**  
> On `/patients`, click the letter "A" in the A-Z filter strip.  
> Assert: only patients whose names begin with "A" are shown. Click "All" — all patients return.

**Expected:** `activeLetter` state set. Mock filter applies. Active chip shows teal highlight.

---

### TC-PAT-005 — Gender toggle filter — Female
**Prompt:**  
> On `/patients`, click the "Female" toggle button in the gender filter.  
> Assert: only female patients shown. Table count updates. Toggle button shows selected state.

**Expected:** `genderFilter = 'female'` applied. Male/Other rows hidden.

---

### TC-PAT-006 — Gender + alphabet combined filter
**Prompt:**  
> Select gender "Male" AND click letter "B" in alphabet strip.  
> Assert: only male patients whose name starts with "B" appear (e.g., "Bob Smith").

**Expected:** Both filters apply simultaneously via `&&` logic in the filter function.

---

### TC-PAT-007 — Click row navigates to patient detail
**Prompt:**  
> On `/patients`, click anywhere on the "Alice Johnson" row.  
> Assert: navigated to `/patients/1`. Detail page renders Alice's profile.

**Expected:** `onClick={() => navigate('/patients/1')}` fires. Detail page for patient ID 1 loads.

---

### TC-PAT-008 — Pagination controls work
**Prompt:**  
> On `/patients`, change "Rows per page" from 25 to 10.  
> Assert: table shows max 10 rows. Next page button becomes enabled (if >10 patients).

**Expected:** `TablePagination` updates `rowsPerPage=10`. Next page navigates to rows 11-20.

---

### TC-PAT-009 — View Profile button opens detail
**Prompt:**  
> On the patients table, click the external link (OpenInNew) icon in the Actions column for any row.  
> Assert: navigates to `/patients/:id` without navigating away from the row click zone.

**Expected:** `e.stopPropagation()` prevents row click double-triggering. Icon navigates correctly.

---

## 2. Add Patient (`/patients/new`)

### TC-PAT-010 — Add Patient form navigation
**Prompt:**  
> On `/patients`, click "Add Patient" button.  
> Assert: navigated to `/patients/new`. A full-page form for creating a new patient renders.

**Expected:** Button calls `navigate('/patients/new')`. Create page loads with all fields empty.

---

### TC-PAT-011 — Required fields validation
**Prompt:**  
> On `/patients/new`, click "Save" without filling any fields.  
> Assert: red validation errors appear under First Name, Last Name, Email, Phone. All say "Required" or similar.

**Expected:** zod schema: first_name min 1, last_name min 1, email valid, phone min 7. RHF shows errors.

---

### TC-PAT-012 — Invalid email validation
**Prompt:**  
> On `/patients/new`, enter "notanemail" in the Email field. Click Save.  
> Assert: field shows "Invalid email" or "Enter a valid email address".

**Expected:** zod `z.string().email()` fails. React Hook Form shows inline error.

---

### TC-PAT-013 — Successful patient creation
**Prompt:**  
> On `/patients/new`, fill: First Name "John", Last Name "Doe", Email "john.doe@test.com", Phone "+1 555-9999", DOB "1990-01-01", Gender "Male". Click Save.  
> Assert: success snackbar appears. Redirected to patient list or new patient's detail page.

**Expected:** `CREATE_PATIENT_MUTATION` fires or mock silent-succeeds. Snackbar shows. Navigation fires.

---

### TC-PAT-014 — Optional fields do not block save
**Prompt:**  
> On `/patients/new`, fill only required fields (First Name, Last Name, Email, Phone). Leave DOB and Gender empty. Click Save.  
> Assert: form submits without DOB/Gender errors. Success snackbar shown.

**Expected:** `date_of_birth` and `gender` are optional in zod schema. No validation error for empty optional fields.

---

## 3. Patient Detail Page (`/patients/:id`)

### TC-PAT-015 — Profile page shows all patient data
**Prompt:**  
> Navigate to `/patients/1`.  
> Assert: Name, Email, Phone, DOB, Gender visible. Profile avatar shows first initial. Appointment history section or tab visible.

**Expected:** Detail page renders with all data sections. No blank panels.

---

### TC-PAT-016 — Unknown patient ID shows not-found
**Prompt:**  
> Navigate to `/patients/99999`.  
> Assert: "Patient not found" message or redirect to 404 page. No React crash.

**Expected:** `data?.patient` is null → graceful error state rendered.

---

## 4. Edit Patient (`/patients/:id/edit`)

### TC-PAT-017 — Edit form pre-fills existing data
**Prompt:**  
> Navigate to `/patients/1/edit`.  
> Assert: First Name, Last Name, Email, Phone, DOB, Gender fields all pre-filled with Alice Johnson's data.

**Expected:** Edit form loaded with existing patient record values.

---

### TC-PAT-018 — Edit and save patient
**Prompt:**  
> On `/patients/1/edit`, change Phone to "+1 555-0000". Click Save.  
> Assert: success snackbar. Navigate to patient detail. Phone now shows "+1 555-0000".

**Expected:** `UPDATE_PATIENT_MUTATION` fires. Detail page updated. Snackbar shown.

---

### TC-PAT-019 — Cancel edit returns to patient list or detail
**Prompt:**  
> On `/patients/1/edit`, click "Cancel" button.  
> Assert: navigated back to `/patients` or `/patients/1`. No changes saved.

**Expected:** Cancel button calls `navigate(-1)` or `navigate('/patients')`.
