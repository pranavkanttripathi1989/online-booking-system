# Staff Appointments — Test Suggestions

**Derived from:** [staff-appointments-test-results.md](../test-result/staff-appointments-test-results.md)  
**Source File:** `frontend/src/pages/staff/Appointments.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-STFAPPT-001 — Wire Date Range Filters to Filter Logic (TC-07)

**Problem:** "From" and "To" date `<TextField>` fields have no `value` state and no `onChange` handler — completely disconnected from the `filtered` array.

**Fix:**
```jsx
const [fromDate, setFromDate] = useState('');
const [toDate, setToDate] = useState('');

const filtered = appointments.filter((a) => {
  const matchSearch = !search || a.patient.name.toLowerCase().includes(search.toLowerCase()) || a.clinician.name.toLowerCase().includes(search.toLowerCase());
  const matchStatus = statusFilter === 'all' || a.status === statusFilter;
  const apptDate = a.dateTime.split(' ')[0]; // 'YYYY-MM-DD'
  const matchFrom = !fromDate || apptDate >= fromDate;
  const matchTo = !toDate || apptDate <= toDate;
  return matchSearch && matchStatus && matchFrom && matchTo;
});

// In JSX:
<TextField type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
<TextField type="date" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
```

**Priority:** 🔴 High | **Effort:** ~12 lines

---

### SUG-STFAPPT-002 — Implement Book Appointment Submission (TC-19)

**Problem:** "Book Appointment" dialog submit button only calls `setBookOpen(false)` — form data completely discarded. No new appointment added, no API call.

**Fix:**
```jsx
const [bookForm, setBookForm] = useState({ patient: '', clinician: '', clinic: '', room: '', date: '', time: '', duration: 30, service: '', reason: '' });

const handleBook = () => {
  const newAppt = {
    id: appointments.length + 1,
    dateTime: `${bookForm.date} ${bookForm.time}`,
    patient: { name: bookForm.patient, email: '', avatar: bookForm.patient.split(' ').map(w => w[0]).join('') },
    clinician: { name: bookForm.clinician, specialty: '', avatar: '' },
    clinic: bookForm.clinic, room: bookForm.room, duration: bookForm.duration,
    service: bookForm.service, price: 0, status: 'scheduled',
  };
  setAppointments(prev => [...prev, newAppt]);
  setBookOpen(false);
  setBookForm({ patient: '', clinician: '', clinic: '', room: '', date: '', time: '', duration: 30, service: '', reason: '' });
};

// Button:
<Button variant="contained" onClick={handleBook}>Book Appointment</Button>
```

**Priority:** 🔴 High | **Effort:** ~25 lines

---

### SUG-STFAPPT-003 — Implement Edit Icon Handler (TC-12)

**Problem:** Edit (pencil) IconButton has no `onClick`. All rows have a non-functional edit button.

**Fix — Open Book modal pre-filled with appointment data:**
```jsx
const handleEdit = (appt) => {
  setBookForm({ patient: appt.patient.name, clinician: appt.clinician.name, clinic: appt.clinic, room: appt.room, service: appt.service, duration: appt.duration });
  setEditTargetId(appt.id);
  setBookOpen(true);
};

// Button:
<IconButton size="small" onClick={() => handleEdit(appt)}><EditIcon fontSize="small" /></IconButton>
```

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-STFAPPT-004 — Implement Bulk "Cancel Selected" Handler (TC-11)

**Problem:** "Cancel Selected" button in bulk action bar has no onClick. Cannot bulk-cancel appointments.

**Fix:**
```jsx
const handleBulkCancel = () => {
  setAppointments(prev => prev.map(a => selected.includes(a.id) ? { ...a, status: 'cancelled' } : a));
  setSelected([]);
};

// Button:
<Button color="error" variant="outlined" onClick={handleBulkCancel}>Cancel Selected</Button>
```

**Priority:** 🔴 High | **Effort:** ~6 lines

---

### SUG-STFAPPT-005 — Implement Export CSV Handler (TC-21 + Bulk Export)

**Problem:** Both "Export CSV" (header) and bulk "Export" buttons have no onClick. CSV export unavailable.

**Fix — Generate CSV from `filtered` or `selected` appointments:**
```jsx
const handleExportCSV = (rows) => {
  const cols = ['ID', 'Date', 'Patient', 'Clinician', 'Service', 'Status', 'Price'];
  const data = rows.map(a => [a.id, a.dateTime, a.patient.name, a.clinician.name, a.service, a.status, `£${a.price}`]);
  const csv = [cols, ...data].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'appointments.csv'; link.click();
};

// Header button: onClick={() => handleExportCSV(filtered)}
// Bulk Export: onClick={() => handleExportCSV(appointments.filter(a => selected.includes(a.id)))}
```

**Priority:** 🔴 High | **Effort:** ~12 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-STFAPPT-006 — Add Empty State Message for Filtered Table (E4)

**Problem:** When `filtered.length === 0` after applying search/status/date filters, the table body is empty — no user feedback shown.

**Fix:**
```jsx
{filtered.length === 0 && (
  <TableRow>
    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
      No appointments match your current filters
    </TableCell>
  </TableRow>
)}
```

**Priority:** 🟡 Medium | **Effort:** ~6 lines

---

### SUG-STFAPPT-007 — Fix "4 total" Chip to Reflect Actual Count (OBS-6)

**Problem:** `<Chip label={${appointments.length} total}>` shows static mock count (4). When an appointment is cancelled, the chip still shows "4 total" even though a record changed state. Consider what "total" means — all appointments or only active ones.

**Fix options:**
1. Show total of all appointments (current behaviour — acceptable): keep as-is but document it
2. Show only active (non-cancelled): `appointments.filter(a => a.status !== 'cancelled').length`
3. Show filtered count: `filtered.length total`

**Priority:** 🟡 Medium | **Effort:** ~1 line

---

### SUG-STFAPPT-008 — Add Confirm Dialog for Bulk Cancel (E2)

**Problem:** Once bulk "Cancel Selected" has a handler, it should still trigger a confirmation before cancelling multiple appointments at once.

**Fix:** Before calling `handleBulkCancel`, show a ConfirmDialog: "Cancel {n} appointment(s)? All selected patients will be notified."

**Priority:** 🟡 Medium | **Effort:** ~15 lines

---

### SUG-STFAPPT-009 — Add "Reset Filters" Button

**Problem:** No single-click way to clear all filters (search + status + from + to dates). Users must individually reset each one.

**Fix:**
```jsx
{(search || statusFilter !== 'all' || fromDate || toDate) && (
  <Button size="small" onClick={() => { setSearch(''); setStatusFilter('all'); setFromDate(''); setToDate(''); }}>
    Clear All Filters
  </Button>
)}
```

**Priority:** 🟡 Medium | **Effort:** ~6 lines

---

## Additional Test Cases

### SUG-STFAPPT-PLAN-001 — TC: Date Range Filter — From Date Only

> **TC-STFAPPT-22** — Enter "2026-03-21" in From only (no To).  
> Expected: Only appointments on/after 2026-03-21 shown (TR-004: Omar Hassan, 2026-03-21).  
> After SUG-001 fix: `apptDate >= fromDate`.

### SUG-STFAPPT-PLAN-002 — TC: Date Range Filter — No Results in Range

> **TC-STFAPPT-23** — Enter From="2026-01-01" To="2026-01-31".  
> Expected: 0 rows (no appointments in January 2026). Empty state shown (after SUG-006 fix).

### SUG-STFAPPT-PLAN-003 — TC: Book Appointment — Form Validation

> **TC-STFAPPT-24** — Click "Book Appointment" with empty form.  
> Expected (current): Dialog closes, nothing added (no validation).  
> Expected (ideal): Required field validation shown, submit prevented until Patient + Date filled.

### SUG-STFAPPT-PLAN-004 — TC: Bulk Cancel — Confirm and Execute

> **TC-STFAPPT-25** — Select James Brown + Lily Chen. Click "Cancel Selected".  
> Expected (after SUG-004 fix): Both rows change to "Cancelled". Cancel icons disappear. Bulk bar count updates.

### SUG-STFAPPT-PLAN-005 — TC: Export CSV Downloads File

> **TC-STFAPPT-26** — Click "Export CSV" in header.  
> Expected (after SUG-005 fix): Browser triggers download of "appointments.csv" with headers and 4 rows.

### SUG-STFAPPT-PLAN-006 — TC: Edit Pre-fills Form

> **TC-STFAPPT-27** — Click edit (pencil) icon on Emma Wilson.  
> Expected (after SUG-003 fix): Book Appointment dialog opens pre-filled with Emma Wilson's data (patient, clinician, service, duration).

### SUG-STFAPPT-PLAN-007 — TC: Search + Date Range Combined

> **TC-STFAPPT-28** — Type "Emma" + From="2026-03-20" To="2026-03-20".  
> Expected: Only Emma Wilson row (2026-03-20 10:00 — both search and date match).

### SUG-STFAPPT-PLAN-008 — TC: CheckAll Then Filter Changes

> **TC-STFAPPT-29** — Select All (4 rows). Then change Status to "Completed".  
> Expected: `selected = [1,2,3,4]` but `filtered = [3]` (Lily Chen only). Bulk bar shows "4 selected" even though only 1 row visible — potential confusing UX.  
> Source: `selected` state not cleared when filter changes.

### SUG-STFAPPT-PLAN-009 — TC: Cancel Already Cancelled Does Nothing

> **TC-STFAPPT-30** — Try to bulk-cancel already-cancelled rows (Omar Hassan).  
> Expected: `handleCancel` called → `{ ...a, status: 'cancelled' }` same as before — no change in data, no error. Idempotent.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-STFAPPT-001 | Wire date pickers to filter logic | 🐛 Bug Fix | 🔴 High |
| SUG-STFAPPT-002 | Implement Book Appointment submit | 🐛 Bug Fix | 🔴 High |
| SUG-STFAPPT-003 | Implement Edit icon handler | 🐛 Bug Fix | 🔴 High |
| SUG-STFAPPT-004 | Implement Bulk Cancel handler | 🐛 Bug Fix | 🔴 High |
| SUG-STFAPPT-005 | Implement Export CSV (header + bulk) | 🐛 Bug Fix | 🔴 High |
| SUG-STFAPPT-006 | Add empty state message | ✨ UX | 🟡 Medium |
| SUG-STFAPPT-007 | Fix "4 total" chip semantics | ✨ UX | 🟡 Medium |
| SUG-STFAPPT-008 | Confirm dialog for bulk cancel | ✨ UX | 🟡 Medium |
| SUG-STFAPPT-009 | Add Reset Filters button | ✨ UX | 🟡 Medium |

### Quick Wins (< 10 lines):
- **SUG-STFAPPT-006**: Empty state `<TableCell colSpan={9}>` — 6 lines
- **SUG-STFAPPT-004**: `handleBulkCancel` function — 6 lines
- **SUG-STFAPPT-007**: Fix chip label — 1 line
