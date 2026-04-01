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
Status: PENDING
Notes: detail.jsx line 270: "View Result" button renders but has no onClick prop.
       Should navigate to /test-results/:id or open a detail drawer.
Priority: Medium
```

### SUG-PT-004 — "Upload Document" Button Has No Handler
```
Status: PENDING
Notes: detail.jsx line 285: "Upload Document" button in Document tab has no onClick.
       Should open a file picker or upload dialog.
Priority: Medium
```

### SUG-PT-005 — Add Patient Dialog Not Accessible from List Header
```
Status: PENDING
Notes: index.jsx PatientsPage has addOpen state and AddPatientDialog rendered but
       the AddPatientDialog is never called — addOpen is never set to true.
       "Add Patient" button navigates to /patients/new instead of opening inline dialog.
       If inline dialog approach is desired, change: onClick={() => setAddOpen(true)}
Priority: Medium (design decision: inline dialog vs separate page — currently using /patients/new page approach)
```

### SUG-PT-006 — Primary Clinician Avatar Hardcoded "JS"
```
Status: PENDING
Notes: detail.jsx line 197: Avatar bgcolor=#0B7B5C, content hardcoded "JS".
       Should derive initials from p.primary_clinician: p.primary_clinician?.split(' ').map(n=>n[0]).join('').slice(0,2)
Priority: Medium
```

### SUG-PT-007 — CreatePatientPage: Email Not Validated Inline
```
Status: PENDING
Notes: CreatePatientPage validate() only checks first_name + last_name.
       Invalid emails (e.g. "notanemail") pass validation and reach the mutation.
       Fix: add z.string().email() check or regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ to validate().
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
Status: PENDING
Notes: Rows are clickable (cursor:pointer) but have no tabIndex or onKeyDown handler.
       Keyboard users cannot navigate rows — accessibility gap.
Priority: Medium
```

### SUG-PT-013 — Confirm Dialog Before Navigating Away From Create/Edit Form
```
Status: PENDING
Notes: CreatePatientPage and EditPatientPage have no unsaved changes guard.
       Clicking Cancel or Back silently discards entered data.
       useBeforeUnload(dirty) or a Discard confirmation dialog would prevent accidental loss.
Priority: Medium
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PT-001 | EditPatientPage mock fallback | ✅ COMPLETED |
| SUG-PT-002 | EditPatientPage mutation catch | ✅ COMPLETED |
| SUG-PT-003 | "View Result" button onClick | ⏳ PENDING |
| SUG-PT-004 | "Upload Document" button onClick | ⏳ PENDING |
| SUG-PT-005 | Add Patient inline dialog disconnected | ⏳ PENDING |
| SUG-PT-006 | Primary clinician avatar hardcoded "JS" | ⏳ PENDING |
| SUG-PT-007 | Email validation on create form | ⏳ PENDING |
| SUG-PT-008 | Dead addOpen/dialog state cleanup | ⏳ PENDING |
| SUG-PT-009 | A-Z: grey out empty-result letters | ⏳ PENDING |
| SUG-PT-010 | Gender filter reset cue | ⏳ PENDING |
| SUG-PT-012 | Table keyboard navigation | ⏳ PENDING |
| SUG-PT-013 | Unsaved changes guard (create/edit) | ⏳ PENDING |
