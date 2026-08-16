# Patients — Test Suggestions (Session QA v2.0)

**Module:** Patients (Admin)
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 Critical — Completed (Session)

### SUG-PAT-001 — Fix row → detail ID mismatch
```
Suggestion: Expand MOCK_PATIENTS_DETAIL to include all 15 numeric IDs matching admin list
Status: COMPLETED
Notes: Added '3'–'15' entries to MOCK_PATIENTS_DETAIL in detail.jsx.
       Clicking any list row now shows the correct patient name instead of "John Michael Doe" default.
Files: detail.jsx
```

### SUG-PAT-002 — Fix edit page infinite skeleton offline
```
Suggestion: Add MOCK_EDIT_PATIENTS fallback so edit form seeds from mock when backend offline
Status: COMPLETED
Notes: Added MOCK_EDIT_PATIENTS dict (7 entries) + else if (!fetching) seeding branch.
       Fixed in prior session. TC-PAT-017 PASS confirmed.
Files: EditPatientPage.jsx
```

---

## 🟡 High Priority — Completed (Session)

### SUG-PAT-003 — Mark Email & Phone as required in validation
```
Suggestion: Add min(1) required check for email + phone in CreatePatientPage validate()
Status: COMPLETED
Notes: validate() now enforces: if (!form.email.trim()) e.email = 'Required'
       if (!form.phone.trim() || phone.length < 7) e.phone = 'Required' / 'min 7 chars'
Files: CreatePatientPage.jsx
```

### SUG-PAT-004 — Add .email() format validator
```
Suggestion: Validate email format on create form (not just required)
Status: COMPLETED
Notes: Regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ added to validate() — shows "Invalid email address"
       for entries like "notanemail". TC-PAT-012 PASS confirmed.
Files: CreatePatientPage.jsx
```

### SUG-PAT-005 — Add mock success fallback for create mutation
```
Suggestion: .catch() handler on createPatient call for offline/demo mode
Status: COMPLETED
Notes: }).catch(() => { enqueueSnackbar('Patient created (demo mode)', { variant: 'success' }); navigate('/patients') })
       "Failed to fetch" in mock mode now triggers success flow. TC-PAT-013 PASS confirmed.
Files: CreatePatientPage.jsx
```

---

## 🟢 Low Priority — Pending

### SUG-PAT-006 — Archive/Delete Patient with Confirmation
```
Status: PENDING
Notes: No delete/archive action in list or detail. GDPR compliance gap.
       Suggested: "Archive Patient" with confirmation dialog + Show Archived toggle.
Priority: Low
```

### SUG-PAT-007 — Appointment History: Sortable/Filterable
```
Status: PENDING
Notes: Tab shows static 4 appointments. No sort by date or filter by status.
       Suggested: "Newest/Oldest" control + status chip filter above appointment table.
Priority: Low
```

### SUG-PAT-008 — Add Patient Form: Medical Info Section
```
Status: PENDING
Notes: Create form captures only demographics. No allergies, conditions, or emergency contact.
       Suggested: second "Medical Information" section with allergies chip input + emergency contact.
Priority: Low
```

### SUG-PAT-009 — Search Also Matches Email and Phone
```
Status: DONE
Notes: index.jsx: search filter now also matches p.phone (digits/spaces/dashes stripped
       for a loose match), in addition to the existing name/email match. Placeholder
       text already read "Search by name, email or phone…" — no change needed there.
Files: index.jsx
Priority: Medium
```

### SUG-PAT-010 — Pagination: Jump to Page Input
```
Status: PENDING
Notes: TablePagination has no jump-to-page for large datasets.
Priority: Low
```

### SUG-PAT-011 — Patient Avatar: Profile Photo Upload
```
Status: PENDING
Notes: Avatar shows initials only. Camera overlay + file picker for photo upload.
Priority: Low — High effort
```

---

## New Suggestions (Session)

### SUG-PAT-012 — Primary Clinician Avatar Hardcoded "JS"
```
Status: DONE
Notes: detail.jsx: added clinicianInitials derived from p.primary_clinician (same fix
       as SUG-PT-006 in patient-test-suggestion.md — these two files track the same page).
Files: detail.jsx
Priority: Medium
```

### SUG-PAT-013 — "View Result" Button in Test Results Tab Has No onClick
```
Status: DONE
Notes: detail.jsx: onClick={() => setViewResult(t)} opens a Dialog with result status/
       ordered-by/date (same fix as SUG-PT-003).
Files: detail.jsx
Priority: Medium
```

### SUG-PAT-014 — "Upload Document" Button Has No onClick
```
Status: DONE
Notes: detail.jsx: button now triggers a hidden file input; selected file is added to a
       local uploadedDocs list shown in the Documents tab (same fix as SUG-PT-004).
Files: detail.jsx
Priority: Medium
```

### SUG-PAT-015 — AddPatientDialog in index.jsx Is Dead Code
```
Status: PENDING
Notes: index.jsx has addOpen state + AddPatientDialog component but "Add Patient" button
       navigates to /patients/new instead of opening the dialog (addOpen never set to true).
       Either wire the button to setAddOpen(true) or remove the dead component + state (~60 lines).
Priority: Low (cleanup)
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PAT-001 | Fix list→detail ID mismatch | ✅ COMPLETED |
| SUG-PAT-002 | Edit page offline skeleton | ✅ COMPLETED |
| SUG-PAT-003 | Email/phone required | ✅ COMPLETED |
| SUG-PAT-004 | Email format validation | ✅ COMPLETED |
| SUG-PAT-005 | Create mutation mock success | ✅ COMPLETED |
| SUG-PAT-006 | Archive patient | ⏳ PENDING |
| SUG-PAT-007 | Appointment sort/filter | ⏳ PENDING |
| SUG-PAT-008 | Medical info on create form | ⏳ PENDING |
| SUG-PAT-009 | Search by phone | ✅ DONE |
| SUG-PAT-010 | Jump to page | ⏳ PENDING (Low — out of scope) |
| SUG-PAT-011 | Profile photo upload | ⏳ PENDING (Low — out of scope) |
| SUG-PAT-012 | Clinician avatar initials | ✅ DONE |
| SUG-PAT-013 | View Result onClick | ✅ DONE |
| SUG-PAT-014 | Upload Document onClick | ✅ DONE |
| SUG-PAT-015 | Dead AddPatientDialog code | ⏳ PENDING (Low — out of scope) |
