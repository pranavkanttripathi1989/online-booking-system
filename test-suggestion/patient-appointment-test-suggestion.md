# Patient Appointments — Test Suggestions (Session QA v2.0)

**Module:** Patient Portal — My Appointments
**Updated:** 2026-03-31 (Session QA)

---

## 🔴 High Priority — Bug Fixes (Session Completed)

### SUG-PTAPPT-001 — Cancel Confirm Dialog + State Update
```
Status: COMPLETED
Notes: setCancelId(id) triggers Dialog. handleCancel() maps appointment to status='cancelled'.
       Subtitle and tab counts update automatically since upcoming/past derived from state.
Files: Appointments.jsx
```

### SUG-PTAPPT-002 — Sort Dropdown Logic
```
Status: COMPLETED
Notes: useState(sortBy) + useMemo sort by date (default), doctor (localeCompare), price (numeric).
       Sort is reactive — no re-render delay.
Files: Appointments.jsx
```

### SUG-PTAPPT-003 — Receipt Button Handler
```
Status: COMPLETED
Notes: onReceipt prop navigates to /patient/appointments/:id/receipt.
       aria-label added: "Download receipt for {service}".
Files: Appointments.jsx
```

### SUG-PTAPPT-004 — Clear Search on Tab Switch
```
Status: COMPLETED
Notes: handleTabChange() calls setSearch('') before setTab(v). 1-line fix confirmed.
Files: Appointments.jsx
```

### SUG-PTAPPT-005 — Null Guard for £undefined
```
Status: COMPLETED
Notes: {appt.price != null ? `£${appt.price}` : 'Price TBD'} — safe for missing prices.
Files: Appointments.jsx
```

---

## 🟡 Medium Priority — UX (Session Completed)

### SUG-PTAPPT-006 — Doctor Name Text Overflow Guard
```
Status: COMPLETED
Notes: <Typography noWrap sx={{ maxWidth: 280 }}> applied to doctor name.
Files: Appointments.jsx
```

### SUG-PTAPPT-007 — Dynamic upcoming/past After Cancellation
```
Status: COMPLETED
Notes: Companion to SUG-001 — appointments converted to useState(APPOINTMENTS).
       upcoming/past derived from state: counts and subtitle update reactively.
Files: Appointments.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-PTAPPT-008 — Sort Descending Toggle
```
Status: PENDING
Notes: Once ascending sort is confirmed stable, add sortDir state toggle (asc/desc).
       Low UX value for now; revisit after user testing.
Priority: Low
```

### SUG-PTAPPT-009 — Backend Apollo Integration
```
Status: PENDING
Notes: Deferred — requires GET_APPOINTMENTS query + CANCEL_APPOINTMENT mutation.
       Full mock layer already working offline.
Priority: Backend milestone
```

---

## 🟢 Low Priority (Completed)

### SUG-PTAPPT-010 — Correct TC-PTAPPT-05 Plan Wording
```
Status: COMPLETED
Notes: TC-05 updated in test plan. "Clinic shown as 'Online'" changed to "Chip label shows 'Video'".
Files: patient-appointment-test-plan.md
```

---

## New Suggestions Discovered in Session

### SUG-PTAPPT-011 — Reschedule Button for Upcoming Appointments
```
Status: PENDING
Notes: Currently there is no way to reschedule. Adding a "Reschedule" button next to Cancel
       would be a valuable UX improvement for patients.
Priority: Medium
```

### SUG-PTAPPT-012 — Add Appointment Detail Drawer/Page
```
Status: PENDING
Notes: Clicking on a card reveals no additional information. A detail drawer or link to
       /patient/appointments/:id would improve appointment transparency.
Priority: Medium
```

### SUG-PTAPPT-013 — ErrorBoundary on PatientAppointments
```
Status: PENDING
Notes: No crash boundary wrapping the component. Consistent with other modules.
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PTAPPT-001 | Cancel confirm dialog + state update | ✅ COMPLETED |
| SUG-PTAPPT-002 | Sort dropdown with useMemo logic | ✅ COMPLETED |
| SUG-PTAPPT-003 | Receipt onClick handler | ✅ COMPLETED |
| SUG-PTAPPT-004 | Clear search on tab switch | ✅ COMPLETED |
| SUG-PTAPPT-005 | Price null guard (£TBD) | ✅ COMPLETED |
| SUG-PTAPPT-006 | Doctor name noWrap + maxWidth | ✅ COMPLETED |
| SUG-PTAPPT-007 | Convert APPOINTMENTS to state | ✅ COMPLETED |
| SUG-PTAPPT-008 | Sort descending toggle | ⏳ PENDING |
| SUG-PTAPPT-009 | Backend Apollo integration | ⏳ PENDING |
| SUG-PTAPPT-010 | Fix TC-05 plan wording | ✅ COMPLETED |
| SUG-PTAPPT-011 | Reschedule button | ⏳ PENDING |
| SUG-PTAPPT-012 | Appointment detail drawer | ⏳ PENDING |
| SUG-PTAPPT-013 | ErrorBoundary wrapper | ⏳ PENDING |
