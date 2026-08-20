---
id: TS033
type: test-suggestion
feature: staff
created: 2026-03-19
updated: 2026-08-17
status: done
parent: unknown
related: [TP033, TR032]
---

# Staff Module — Test Suggestions (v2.0)

**Module:** Staff Management (`/staff`, `/staff/new`, `/staff/edit/:id`)
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED

### SUG-STAFF-001 — Fix "Add Staff Member" Button onClick Navigation
```
Status: COMPLETED
Notes: index.jsx line 83: onClick={() => navigate('/staff/new')} confirmed present.
       Button navigates to AddStaffPage correctly.
Files: staff/index.jsx
```

### SUG-STAFF-002 — Fix Edit Pencil Icon onClick Navigation
```
Status: COMPLETED
Notes: index.jsx line 197: onClick={(e) => { e.stopPropagation(); navigate(`/staff/edit/${s.id}`) }}
       Row click also navigates (line 168: onClick={() => navigate(`/staff/edit/${s.id}`)}).
       e.stopPropagation() prevents double-navigation when clicking icon.
Files: staff/index.jsx
```

---

## 🟡 Medium Priority — COMPLETED

### SUG-STAFF-003 — Tune Password Strength Scoring Thresholds
```
Status: COMPLETED
Notes: new.jsx lines 112–116: Multi-tier strength scoring:
       uppercase + digit + special + length≥8 → 4 (Strong)
       length≥10 OR (uppercase + digit) → 3 (Good)
       length≥6 → 2 (Fair)
       else → 1 (Weak)
       "Abc123!!" correctly scores 4 (Strong).
Files: staff/new.jsx
```

### SUG-STAFF-004 — Email Field Required Validation + Format Check
```
Status: COMPLETED
Notes: new.jsx line 87: if (!form.email.trim()) e.email = 'Email is required'
       new.jsx line 88: else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email address'
       Both blank and malformed emails show correct errors.
Files: staff/new.jsx
```

### SUG-STAFF-005 — Wire Deactivate Icon in List to Confirmation Dialog
```
Status: COMPLETED
Notes: index.jsx line 59: const [deactivateTarget, setDeactivateTarget] = useState(null)
       line 204: onClick={(e) => { e.stopPropagation(); setDeactivateTarget(s) }}
       lines 221–244: Dialog renders deactivateTarget?.name; "Yes, Deactivate" fires
       enqueueSnackbar("${name} has been deactivated", { variant: 'warning' })
Files: staff/index.jsx
```

---

## 🟢 Low Priority — Pending

### SUG-STAFF-006 — Sortable Column Headers on Staff Table
```
Status: PENDING
Notes: Add sortBy/sortDir state. Clicking column header sorts asc/desc/reset.
       Show ↑↓ arrow indicator on active sort column.
       Default sort: Name A–Z.
Priority: Low
```

### SUG-STAFF-007 — Read-Only Staff Detail Page
```
Status: PENDING
Notes: Add /staff/:id read-only view (separate from /staff/:id/edit).
       Row click → detail. Edit icon → edit. Prevents accidental edits.
Priority: Low
```

### SUG-STAFF-008 — Bulk Status Update from Staff List
```
Status: PENDING
Notes: Checkbox selection for rows. Floating action bar:
       "Activate selected (N)", "Mark as On Leave (N)", "Export selected".
Priority: Low
```

---

## New Suggestions (Session)

### SUG-STAFF-009 — Add Phone Format Validation
```
Status: PENDING
Notes: Phone field (#90-96 in validate) only checks if not empty. No format validation.
       Fix: /^\+?[\d\s\-().]{7,}$/.test(form.phone) or similar E.164 regex.
Priority: Low
```

### SUG-STAFF-010 — Persist Staff State Across Pages
```
Status: COMPLETED
Notes: Added a `staff` collection + getStaff()/getStaffById()/createStaff()/updateStaff() to
       mocks/store.js. index.jsx, new.jsx and edit.jsx now read via useMockData(store => store.getStaff())
       and write via useMockMutation(MockStore.createStaff/updateStaff), so staff added on /staff/new
       (and edits/deactivations from /staff/edit/:id) now persist and reflect immediately on /staff.
Files: mocks/store.js, staff/index.jsx, staff/new.jsx, staff/edit.jsx
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-STAFF-001 | Add Staff button navigation | ✅ COMPLETED |
| SUG-STAFF-002 | Edit icon navigation | ✅ COMPLETED |
| SUG-STAFF-003 | Password strength tuning | ✅ COMPLETED |
| SUG-STAFF-004 | Email required + format validation | ✅ COMPLETED |
| SUG-STAFF-005 | Deactivate dialog from list | ✅ COMPLETED |
| SUG-STAFF-006 | Sortable columns | ⏳ PENDING |
| SUG-STAFF-007 | Read-only staff detail page | ⏳ PENDING |
| SUG-STAFF-008 | Bulk status update | ⏳ PENDING |
| SUG-STAFF-009 | Phone format validation | ⏳ PENDING (New) |
| SUG-STAFF-010 | Persist new staff to MockStore | ✅ COMPLETED |
