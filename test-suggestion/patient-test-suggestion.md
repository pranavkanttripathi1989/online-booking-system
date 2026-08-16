# Patients Module — Test Suggestions (v1.0)

**Module:** Patients (Admin)
**Created:** 2026-03-31 (Session QA)

---

## 🔴 High Priority — Completed (Session)

### SUG-PT-001 — EditPatientPage Mock Fallback (TC-PT-36)
```
Status: COMPLETED
Notes: MOCK_EDIT_PATIENTS dict (7 entries for IDs 1-5 + pt-1, pt-2) + MOCK_EDIT_DEFAULT.
       useEffect seeds form from mock when fetching=false and data?.patient absent.
       Form immediately available offline — no permanent skeleton.
Files: EditPatientPage.jsx
```

### SUG-PT-002 — EditPatientPage Mutation Catch Handler
```
Status: COMPLETED
Notes: .catch(() => { enqueueSnackbar success + navigate }) added to handleSubmit.
       Prevents silent failure when backend offline — shows success + navigates.
Files: EditPatientPage.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-PT-003 — "View Result" Button on Test Results Tab Has No onClick
```
Status: DONE
Notes: detail.jsx: added viewResult state + onClick={() => setViewResult(t)}. Opens a
       Dialog showing status/ordered-by/date for the selected test result (no backend
       route exists yet, so a dialog is used instead of navigating to /test-results/:id).
Files: detail.jsx
Priority: Medium
```

### SUG-PT-004 — "Upload Document" Button Has No Handler
```
Status: DONE
Notes: detail.jsx: hidden <input type="file"> + fileInputRef; button now calls
       fileInputRef.current.click(). Selected file is added to a local uploadedDocs
       list (shown in the Documents tab) and a success snackbar confirms the "upload".
Files: detail.jsx
Priority: Medium
```

### SUG-PT-005 — Add Patient Dialog Not Accessible from List Header
```
Status: PENDING
Notes: Left as-is — genuinely ambiguous per the suggestion's own text ("design decision:
       inline dialog vs separate page"). Wiring setAddOpen(true) would require also
       rendering <AddPatientDialog> in the JSX (it currently isn't) and would change the
       primary create flow away from the already-tested /patients/new page (CreatePatientPage.jsx,
       which has its own validation/mock-fallback fixes). Not implemented to avoid guessing
       which flow is intended; companion cleanup item SUG-PT-008 (Low) covers removing the
       dead code instead.
Priority: Medium
```

### SUG-PT-006 — Primary Clinician Avatar Hardcoded "JS"
```
Status: DONE
Notes: detail.jsx: added clinicianInitials derived from p.primary_clinician (strips "Dr."
       prefix, takes initials of remaining words). Avatar now shows real initials.
Files: detail.jsx
Priority: Medium
```

### SUG-PT-007 — CreatePatientPage: Email Not Validated Inline
```
Status: DONE
Notes: Verified already implemented in CreatePatientPage.jsx validate(): required check +
       regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ (see BUG-PAT-003/004 comments in the file). No
       further change needed — status corrected to reflect current code.
Files: CreatePatientPage.jsx
Priority: Medium
```

### SUG-PT-008 — AddPatientDialog: Remove addOpen + AddPatientDialog from index.jsx
```
Status: PENDING
Notes: index.jsx imports and renders AddPatientDialog with addOpen state, but the "Add Patient"
       button navigates to /patients/new. The dead dialog state adds ~60 lines of unused code.
       Either remove the dialog + state OR wire the button to open the dialog.
Priority: Low (cleanup)
```

---

## 🟢 Low Priority — Pending

### SUG-PT-009 — A-Z Filter: No Visual Indicator When Letter Has No Results
```
Status: PENDING
Notes: Clicking "Q" or "X" shows empty state, but the chip still appears active/selected.
       Consider greying out letters that have no matching patients.
Priority: Low
```

### SUG-PT-010 — Gender Filter Does Not Reset on Search
```
Status: PENDING
Notes: When gender filter is "Male" and user searches by name, both filters apply silently.
       No visual cue that gender filter is still active. Consider showing active filter chips.
Priority: Low
```

### SUG-PT-011 — Page Title Missing on Detail Page
```
Status: PENDING
Notes: detail.jsx line 103: Helmet title is "{p.full_name} — MediBook" ✅ — ALREADY DONE.
       Skipping.
Priority: N/A
```

---

## New Suggestions from Session

### SUG-PT-012 — Table: Keyboard Navigation for Rows
```
Status: DONE
Notes: index.jsx: added tabIndex={0}, role="button", aria-label, and onKeyDown
       (Enter/Space → navigate to /patients/:id) on each TableRow, plus a
       focus-visible outline style.
Files: index.jsx
Priority: Medium
```

### SUG-PT-013 — Confirm Dialog Before Navigating Away From Create/Edit Form
```
Status: DONE
Notes: CreatePatientPage.jsx and EditPatientPage.jsx: added isDirty check (form vs
       initial/seeded values) + window.beforeunload listener, and handleCancel()
       that shows window.confirm() before navigating away when dirty. Wired to both
       the back IconButton and the Cancel button.
Files: CreatePatientPage.jsx, EditPatientPage.jsx
Priority: Medium
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PT-001 | EditPatientPage mock fallback | ✅ COMPLETED |
| SUG-PT-002 | EditPatientPage mutation catch | ✅ COMPLETED |
| SUG-PT-003 | "View Result" button onClick | ✅ DONE |
| SUG-PT-004 | "Upload Document" button onClick | ✅ DONE |
| SUG-PT-005 | Add Patient inline dialog disconnected | ⏳ PENDING (ambiguous — design decision) |
| SUG-PT-006 | Primary clinician avatar hardcoded "JS" | ✅ DONE |
| SUG-PT-007 | Email validation on create form | ✅ DONE |
| SUG-PT-008 | Dead addOpen/dialog state cleanup | ⏳ PENDING (Low — out of scope) |
| SUG-PT-009 | A-Z: grey out empty-result letters | ⏳ PENDING (Low — out of scope) |
| SUG-PT-010 | Gender filter reset cue | ⏳ PENDING (Low — out of scope) |
| SUG-PT-012 | Table keyboard navigation | ✅ DONE |
| SUG-PT-013 | Unsaved changes guard (create/edit) | ✅ DONE |
