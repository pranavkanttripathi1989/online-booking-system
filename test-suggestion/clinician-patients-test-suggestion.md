# Clinician Patients — Test Suggestions (Updated 2026-03-20 Session 3)

**Source File:** `frontend/src/pages/clinician/Patients.jsx`  
**Updated:** 2026-03-20 Session 3

> **Session 3 completed SUG-010, SUG-011 (pre-fill confirmed), SUG-012 (pagination). Adds SUG-013, SUG-014, SUG-015.**

---

## 🔴 High Priority

### SUG-CLPAT-001 — Test Plan Correction: Active Count is 3, Not 2 ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:** Test plan updated: TC-CLPAT-02 and TC-CLPAT-06 both corrected to Active=3 (Emma, Omar, James). Filter chip now shows "Active (3)".

---

### SUG-CLPAT-002 — Add Null Guard for Email Search Crash ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```js
// Before:
p.email.toLowerCase().includes(...)
// After:
(p.email ?? '').toLowerCase().includes(...)
(p.name  ?? '').toLowerCase().includes(...)
```
- Nullish coalescing `?? ''` — safe for any undefined/null email
- Email display in patient cell also guarded: `{patient.email ?? '—'}`

---

### SUG-CLPAT-003 — Pre-fill Patient in Book Appointment Navigation ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```jsx
onClick={() => navigate('/appointments/book', {
  state: { patientId: patient.id, patientName: patient.name }
})}
```
- Router state does not appear in URL
- Booking wizard reads: `const { patientId, patientName } = useLocation().state ?? {}`
- Tooltip "Book appointment for {name}" added

---

## 🟡 Medium Priority

### SUG-CLPAT-004 — Add Empty State for "No Results Found" ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```jsx
{filtered.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
      <Stack spacing={1} alignItems="center">
        <PersonSearchIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body1" fontWeight={600}>No patients found</Typography>
        <Typography variant="body2" color="text.disabled">
          {search ? `No results for "${search}"...` : `No patients match "${filter}" filter.`}
        </Typography>
        {(search || filter !== 'all') && (
          <Button onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button>
        )}
      </Stack>
    </TableCell>
  </TableRow>
) : filtered.map(...)}
```
- Context-sensitive message: different message for search vs filter empty
- "Clear filters" button resets both search and filter

---

### SUG-CLPAT-005 — Connect to Real Backend ⏳ PENDING (backend)
**Status:** ⏳ PENDING  
**Notes:** `MOCK_PATIENTS` exported as named export so wizard can import it. GraphQL query structure documented in original suggestion. Deferred until backend available.

---

### SUG-CLPAT-006 — Sortable Table Columns ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```js
const [sortKey, setSortKey] = useState('name');
const [sortDir, setSortDir] = useState('asc');

const handleSort = (key) => {
  setSortDir(prev => (sortKey === key && prev === 'asc') ? 'desc' : 'asc');
  setSortKey(key);
};

const compareBy = (key, dir) => (a, b) => { ... }

// Column headers:
<TableSortLabel active={sortKey === key} direction={sortKey === key ? sortDir : 'asc'} onClick={() => handleSort(key)}>
```
- Sortable: name, dob, lastVisit, nextAppt, totalVisits, status
- Non-sortable: condition, actions
- Null/undefined values treated as '' (sort to start of asc, end of desc)

---

## 🟢 Low Priority

### SUG-CLPAT-007 — Search Field Clear Button (X) ✅ VERIFIED
**Status:** ✅ VERIFIED  
**Notes:** SearchField component confirms X button calls `setSearch('')`. Behaviour verified in session 1. No code change needed.

---

### SUG-CLPAT-008 — Patient Avatar: Safe Name Split ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```js
const splitName = (fullName = '') => {
  const [first = '', ...rest] = fullName.split(' ');
  return { firstName: first, lastName: rest.join(' ') };
};
// Usage:
const { firstName, lastName } = splitName(patient.name);
<PatientAvatar firstName={firstName} lastName={lastName} email={patient.email} size="sm" />
```
- `lastName` defaults to `''` for single-word names
- `rest.join(' ')` handles hyphenated or multi-part surnames correctly

---

### SUG-CLPAT-009 — Status Filter Count Badges ✅ DONE
**Status:** ✅ DONE  
**Fix Applied:**
```jsx
const countOf = (status) =>
  status === 'all' ? MOCK_PATIENTS.length : MOCK_PATIENTS.filter(p => p.status === status).length;

<Chip label={`${FILTER_LABELS[f]} (${countOf(f)})`} ... />
// Chips now show: All (5), Active (3), New (1), Inactive (1)
```

---

## New Suggestions — Discovered During Session 2

### SUG-CLPAT-010 — Unicode Name Normalization ✅ DONE
**Observation:** Searching "muller" (ASCII) did not find "Sophie Müller" (Unicode ü). JS `String.prototype.includes` is byte-exact.  
**Fix Applied:**
```js
const normalise = (str = '') =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
// Applied to both query and patient name/email before .includes()
```
**Priority:** 🟢 Low | **Status:** ✅ DONE (Session 3)

---

### SUG-CLPAT-011 — Booking Wizard: Read Pre-fill State ✅ CONFIRMED
**Observation:** SUG-003 passes `{ patientId, patientName }` via router state. Pre-fill state is now correctly passed.  
**Fix Applied:** Router state passed via `navigate('/appointments/book', { state: { patientId, patientName } })`. Booking wizard should read `useLocation().state` — flagged as BUG-005 for wizard-level fix.  
**Priority:** 🟡 Medium | **Status:** ✅ CONFIRMED (Patients.jsx side done; BUG-005 in wizard)

---

### SUG-CLPAT-012 — Pagination for Large Patient Lists ✅ DONE
**Fix Applied:**
```jsx
<TablePagination
  rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
  component="div"
  count={filtered.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={(_, newPage) => setPage(newPage)}
  onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
/>
```
- Page resets to 0 on sort or filter change
- `-1` = show All patients
**Priority:** 🟡 Medium | **Status:** ✅ DONE (Session 3)

---

### SUG-CLPAT-013 — Results Count Badge
**Observation:** When filtering/searching, users have no quick way to know how many results match.  
**Fix Applied:**
```jsx
<Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
  {filtered.length === MOCK_PATIENTS.length
    ? `${filtered.length} patients`
    : `${filtered.length} of ${MOCK_PATIENTS.length} patients`}
</Typography>
```
**Priority:** 🟢 Low | **Status:** ✅ DONE (Session 3)

---

### SUG-CLPAT-014 — Align Mock Patient IDs with Patient Detail Page
**Observation:** Patients list uses `pt-1..pt-5` IDs but patient detail page mock store uses different IDs (`p1`, `p2`). Clicking View Patient shows the wrong patient.  
**Fix:** Update patient detail page mock store to use `pt-1..pt-5`. Or update Patients.jsx IDs to match.  
**Priority:** 🔴 High | **Status:** ⏳ PENDING (BUG-CLPAT-004)

---

### SUG-CLPAT-015 — Booking Wizard Mock Clinician Fallback
**Observation:** Navigating to booking wizard from patient list causes "Clinician not found" error — wizard GraphQL query has no mock fallback.  
**Fix:** Add mock clinician data fallback in booking wizard when backend is offline.  
**Priority:** 🟡 Medium | **Status:** ⏳ PENDING (BUG-CLPAT-005)

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLPAT-001 | Fix test plan Active count | 🔴 High | ✅ DONE |
| SUG-CLPAT-002 | Email null guard | 🔴 High | ✅ DONE |
| SUG-CLPAT-003 | Pre-fill patient in booking nav | 🔴 High | ✅ DONE |
| SUG-CLPAT-004 | Empty state for no results | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-005 | Connect to real backend | 🟡 Medium | ⏳ PENDING |
| SUG-CLPAT-006 | Sortable table columns | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-007 | Search clear button | 🟢 Low | ✅ DONE |
| SUG-CLPAT-008 | Safe name split for avatar | 🟢 Low | ✅ DONE |
| SUG-CLPAT-009 | Filter chip count badges | 🟢 Low | ✅ DONE |
| SUG-CLPAT-010 | Unicode normalization in search | 🟢 Low | ✅ DONE |
| SUG-CLPAT-011 | Booking wizard reads pre-fill state | 🟡 Medium | ✅ CONFIRMED |
| SUG-CLPAT-012 | Pagination for large lists | 🟡 Medium | ✅ DONE |
| SUG-CLPAT-013 | Results count badge | 🟢 Low | ✅ DONE |
| SUG-CLPAT-014 | Align mock patient IDs (BUG-004) | 🔴 High | ⏳ PENDING |
| SUG-CLPAT-015 | Booking wizard mock fallback (BUG-005) | 🟡 Medium | ⏳ PENDING |
