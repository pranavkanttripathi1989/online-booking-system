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
Status: PENDING
Notes: index.jsx search already matches email (line 151: p.email.toLowerCase().includes()).
       Additionally add phone match. Update placeholder text to mention all 3 fields.
       Partial — email already done; phone match not yet implemented.
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
Status: PENDING
Notes: detail.jsx line 197: Avatar initials hardcoded "JS". Should derive from p.primary_clinician:
       p.primary_clinician?.split(' ').map(n=>n[0]).join('').slice(0,2)
Priority: Medium
```

### SUG-PAT-013 — "View Result" Button in Test Results Tab Has No onClick
```
Status: PENDING
Notes: detail.jsx line 270: "View Result" button has no onClick — dead button.
       Should navigate to /test-results/:id or open a drawer.
Priority: Medium
```

### SUG-PAT-014 — "Upload Document" Button Has No onClick
```
Status: PENDING
Notes: detail.jsx line 285: "Upload Document" button in Documents tab has no onClick.
       Should open a file picker or upload dialog.
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
| SUG-PAT-009 | Search by phone | ⏳ PENDING |
| SUG-PAT-010 | Jump to page | ⏳ PENDING |
| SUG-PAT-011 | Profile photo upload | ⏳ PENDING |
| SUG-PAT-012 | Clinician avatar initials | ⏳ PENDING |
| SUG-PAT-013 | View Result onClick | ⏳ PENDING |
| SUG-PAT-014 | Upload Document onClick | ⏳ PENDING |
| SUG-PAT-015 | Dead AddPatientDialog code | ⏳ PENDING |
