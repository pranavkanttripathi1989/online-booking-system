# Staff Appointments — Test Suggestions (v2.0)

**Module:** Staff Appointments (`/staff/appointments`) — `frontend/src/pages/staff/Appointments.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED (Session)

### SUG-STFAPPT-001 — Wire Date Pickers to Filter Logic
```
Status: COMPLETED
Notes: Added fromDate/toDate state (useState('')). TextField value+onChange wired.
       Filter: apptDate (YYYY-MM-DD string) >= fromDate && <= toDate.
       Individual From/To delete chips. Clear Filters button (hasFilters gate).
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-002 — Book Appointment Submit Creates Record
```
Status: COMPLETED
Notes: bookForm state covers all fields. handleBookSubmit(): create mode appends new appointment
       with { id: Date.now(), status: 'scheduled' }. resetBook() clears form after submit.
       Book Appointment button now calls handleBookSubmit.
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-003 — Edit Icon Pre-fills Dialog
```
Status: COMPLETED
Notes: handleEdit(appt): sets editTarget + pre-fills bookForm from appt data + opens dialog.
       Dialog title: "Edit Appointment" (edit mode) / "Book Appointment" (create mode).
       Submit button: "Save Changes" vs "Book Appointment" dynamically.
       Edit mode handleBookSubmit: updates appointment in state via map.
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-004 — Bulk Cancel Selected Handler
```
Status: COMPLETED
Notes: handleBulkCancel(): maps appointments, sets status='cancelled' for all selected ids. Clears selected[].
       "Cancel Selected" Button onClick={handleBulkCancel}.
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-005 — Export CSV (Header + Bulk)
```
Status: COMPLETED
Notes: handleExportCSV(rows): builds CSV with cols [ID,Date,Time,Patient,Clinician,Service,Status,Price].
       Blob → URL.createObjectURL → <a download="appointments.csv"> click → URL.revokeObjectURL.
       Header: onClick={() => handleExportCSV(filtered)}.
       Bulk: onClick={() => handleExportCSV(appointments.filter(a => selected.includes(a.id)))).
Files: staff/Appointments.jsx
```

---

## 🟡 Medium Priority — COMPLETED (Session)

### SUG-STFAPPT-006 — Empty State Message for Filtered Table
```
Status: COMPLETED
Notes: {filtered.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, fontStyle: 'italic' }}>
       No appointments match your current filters</TableCell></TableRow>}
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-007 — Fix "4 total" Chip Semantics
```
Status: COMPLETED
Notes: Chip now: `${appointments.filter(a => a.status !== 'cancelled').length} active · ${appointments.length} total`
       Provides immediate visibility of active vs total.
Files: staff/Appointments.jsx
```

### SUG-STFAPPT-009 — Add Reset Filters Button
```
Status: COMPLETED
Notes: hasFilters = search || statusFilter !== 'all' || fromDate || toDate.
       resetFilters(): clears all 4 filter states. "Clear Filters" Button shown conditionally in filter bar.
       Also: From/To date chips with individual onDelete handlers.
Files: staff/Appointments.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-STFAPPT-008 — Confirm Dialog Before Bulk Cancel
```
Status: PENDING
Notes: Bulk "Cancel Selected" immediately cancels without confirmation.
       Fix: show Dialog: "Cancel {n} appointment(s)? All selected patients will be notified." before executing handleBulkCancel.
Priority: Medium
```

---

## New Suggestions (Session)

### SUG-STFAPPT-010 — Add Required Field Validation to Book Form
```
Status: PENDING
Notes: Book Appointment currently allows submitting with all fields empty, creating a "New Patient / — / scheduled" row.
       Fix: disable submit button until Patient + Date + Time filled, or show validation errors.
       Fix: disabled={!bookForm.patient || !bookForm.date || !bookForm.time}
Priority: Medium
```

### SUG-STFAPPT-011 — Clear Selected When Filters Change
```
Status: PENDING
Notes: selected state not reset when filter changes. Selecting all 4 rows then filtering to "Completed"
       shows "4 selected" bulk bar even though only 1 row visible.
       Fix: useEffect(() => setSelected([]), [statusFilter, fromDate, toDate, search])
Priority: Low
```

### SUG-STFAPPT-012 — Persist New Appointments to MockStore
```
Status: PENDING
Notes: New appointments created via Book dialog only exist in local appointments state (not MockStore).
       Page reload resets to MOCK_APPOINTMENTS. For demo consistency, update MockStore.addAppointment().
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-STFAPPT-001 | Wire date pickers to filter | ✅ COMPLETED |
| SUG-STFAPPT-002 | Book Appointment submit | ✅ COMPLETED |
| SUG-STFAPPT-003 | Edit icon pre-fills dialog | ✅ COMPLETED |
| SUG-STFAPPT-004 | Bulk Cancel handler | ✅ COMPLETED |
| SUG-STFAPPT-005 | Export CSV | ✅ COMPLETED |
| SUG-STFAPPT-006 | Empty state message | ✅ COMPLETED |
| SUG-STFAPPT-007 | "Active · Total" chip | ✅ COMPLETED |
| SUG-STFAPPT-008 | Bulk cancel confirm dialog | ⏳ PENDING |
| SUG-STFAPPT-009 | Clear Filters button | ✅ COMPLETED |
| SUG-STFAPPT-010 | Book form validation | ⏳ PENDING (New) |
| SUG-STFAPPT-011 | Clear selected on filter change | ⏳ PENDING (New) |
| SUG-STFAPPT-012 | MockStore persistence for new appts | ⏳ PENDING (New) |
