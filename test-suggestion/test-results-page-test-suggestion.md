# Medical Test Results Page — Test Suggestions

**Derived from:** [test-results-page-test-results.md](../test-result/test-results-page-test-results.md)  
**Source File:** `frontend/src/pages/test-results/index.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-TRES-001 — Implement "Download PDF" Handler (TC-TRES-20)

**Problem:** "Download PDF" button has no `onClick`. Clicking does nothing. Core feature completely missing.

**Fix — Generate a simple PDF or open a print preview:**
```jsx
const handleDownloadPDF = (result) => {
  // Option 1: Open browser print with result details
  const win = window.open('', '_blank');
  win.document.write(`<h1>${result.test}</h1>
    <p>Patient: ${result.patient}</p>
    <p>Ordered by: ${result.ordered_by}</p>
    <table border="1">
      <tr><th>Parameter</th><th>Result</th><th>Reference</th><th>Flag</th></tr>
      ${result.values.map(v =>
        `<tr><td>${v.name}</td><td>${v.value}</td><td>${v.ref}</td><td>${v.flag}</td></tr>`
      ).join('')}
    </table>`);
  win.print();
};

// In ResultDialog:
<Button onClick={() => handleDownloadPDF(result)}>Download PDF</Button>
```

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-TRES-002 — Implement "Order Test" Button Handler (TC-TRES-21)

**Problem:** "Order Test" button in page header has no `onClick`. The button appears as a primary CTA but is completely non-functional.

**Fix — Open an "Order Test" dialog:**
```jsx
const [orderOpen, setOrderOpen] = useState(false);

<Button onClick={() => setOrderOpen(true)}>Order Test</Button>

// Minimal "Order Test" dialog with patient selector, test type, ordering clinician
<Dialog open={orderOpen} onClose={() => setOrderOpen(false)}>
  <DialogTitle>Order New Test</DialogTitle>
  <DialogContent>
    <TextField label="Patient" fullWidth />
    <TextField select label="Test Type" fullWidth>
      {['Blood Test', 'X-Ray', 'MRI', 'Urine Test'].map(t =>
        <MenuItem value={t}>{t}</MenuItem>)}
    </TextField>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
    <Button variant="contained">Submit Order</Button>
  </DialogActions>
</Dialog>
```

**Priority:** 🔴 High | **Effort:** ~30 lines

---

### SUG-TRES-003 — Fix Unknown Flag Chip Background Color (Edge Case E2)

**Problem:** When a flag value is not in `FLAG_COLORS` (e.g., `flag: 'critical'`), the chip gets:
```js
bgcolor: `${FLAG_COLORS[v.flag]}18`  // = `${undefined}18` = "undefined18"
```
This is an invalid CSS value — the chip renders without a background.

**Fix:**
```jsx
const flagColor = FLAG_COLORS[v.flag] || '#64748B'; // fallback grey for unknown
<Chip
  label={v.flag}
  sx={{
    bgcolor: `${flagColor}18`,
    color: flagColor,
    // ...
  }}
/>
```

**Priority:** 🔴 High | **Effort:** 2 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-TRES-004 — Add "Reset Filters" / Clear Button (OBS-4)

**Problem:** No way to reset all 3 filters (search + type + status) at once. Users must manually clear each one separately.

**Fix:**
```jsx
{(search || typeFilter !== 'All' || statusFilter !== 'All') && (
  <Button size="small" variant="text" onClick={() => {
    setSearch(''); setTypeFilter('All'); setStatusFilter('All');
  }}>
    Clear Filters
  </Button>
)}
```

**Priority:** 🟡 Medium | **Effort:** ~8 lines

---

### SUG-TRES-005 — Add Column Sorting (OBS-6)

**Problem:** Table has no sorting. All 6 results appear in insertion order only. Clinical users need to sort by Date Ordered or Status.

**Fix:**
```jsx
const [sortField, setSortField] = useState('date_ordered');
const [sortDir, setSortDir] = useState('desc');

const sorted = [...filtered].sort((a, b) => {
  const cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
  return sortDir === 'asc' ? cmp : -cmp;
});
```
Use `<TableSortLabel>` MUI component in column headers.

**Priority:** 🟡 Medium | **Effort:** ~25 lines

---

### SUG-TRES-006 — Add Loading Skeleton for Backend Integration

**Problem:** Page renders mock data synchronously. When connected to backend, there will be an initial loading state with no feedback.

**Fix:** While `loading` is true (Apollo `useQuery`), render `<Skeleton>` placeholders for KPI cards and table rows.

**Priority:** 🟡 Medium (future-proofing)

---

### SUG-TRES-007 — Add "low" Flag Color Test Data

**Problem:** `FLAG_COLORS` has `low: '#D97706'` (amber) but no mock data has `flag: 'low'`. No test confirms the "low" path works visually.

**Fix:** Add one mock entry with `flag: 'low'` (e.g., for TR-006 Glucose → "Trace" value marked as `low`). This also enables TC-TRES-22 (see below).

**Priority:** 🟡 Medium | **Effort:** 1 mock data line

---

## Additional Test Cases

### SUG-TRES-PLAN-001 — TC: Type Dropdown Contains All 5 Options (E1)

> **TC-TRES-22** — Type dropdown options validation  
> Click "Type" dropdown.  
> Expected: Options = ["All", "Blood Test", "X-Ray", "MRI", "Urine Test"] — derived dynamically from `new Set(MOCK_RESULTS.map(r => r.type))`.  
> Confirm: Adding a new mock result with `type: 'DNA Testing'` would auto-add it to the dropdown (since `TYPE_ICONS['DNA Testing'] = '🧬'` already exists).

### SUG-TRES-PLAN-002 — TC: Low Flag Color Display (E2 extension)

> **TC-TRES-23** — "low" flag shows amber color  
> After adding a mock result with `flag: 'low'`, open that result's dialog.  
> Expected: value text color = amber `#D97706`. Flag chip: amber bg (`#D9770618`) + amber text.  
> Source: `FLAG_COLORS = { low: '#D97706' }`.

### SUG-TRES-PLAN-003 — TC: Unknown Flag Falls Back to Grey (E2)

> **TC-TRES-24** — Unknown flag value renders safely  
> Inject mock data with `flag: 'critical'` (not in FLAG_COLORS).  
> Expected (current bug): chip bgcolor = "undefined18" — invalid CSS.  
> Expected (after SUG-003): grey chip bg (#64748B + 18% alpha).

### SUG-TRES-PLAN-004 — TC: Download PDF Clicked (Bug Repro)

> **TC-TRES-25** — Verify Download PDF is non-functional (TC-20 repro)  
> Open any completed result (TR-001, TR-002, TR-003, TR-006).  
> Click "Download PDF". Monitor browser download prompt and Network tab.  
> Expected: No download. No network request. No browser action.

### SUG-TRES-PLAN-005 — TC: Order Test Clicked (Bug Repro)

> **TC-TRES-26** — Verify Order Test is non-functional (TC-21 repro)  
> Click "Order Test" button in header.  
> Expected: No modal opened, no route navigation, no console action.  
> After SUG-002 fix: an "Order New Test" dialog should open.

### SUG-TRES-PLAN-006 — TC: Reset Filters Clears All

> **TC-TRES-27** — Reset all filters at once  
> Set Search = "John", Type = "Blood Test", Status = "Completed".  
> Expected: 1 row shown (TR-001).  
> Click "Clear Filters" button (after SUG-004 fix).  
> Expected: All 6 rows returned, all 3 filters reset.

### SUG-TRES-PLAN-007 — TC: Search is Case-Insensitive

> **TC-TRES-28** — Case-insensitive patient/test/ID search  
> Type "sarah" (lowercase) → same result as "Sarah".  
> Type "tr-001" (lowercase) → same result as "TR-001".  
> Source: `.toLowerCase().includes(search.toLowerCase())`.

### SUG-TRES-PLAN-008 — TC: Sort by Date Ordered (After Enhancement)

> **TC-TRES-29** — Column sort on Date Ordered  
> After SUG-005 addition: click "Date Ordered" column header.  
> Expected: Oldest first (TR-006: 2026-02-15) → Newest last (TR-005: 2026-03-10).  
> Click again: reverse order.

### SUG-TRES-PLAN-009 — TC: Urine Test Filter → TR-006 Only

> **TC-TRES-30** — Type = "Urine Test" filter  
> Select "Urine Test" from Type dropdown.  
> Expected: 1 row — TR-006 Jessica Liu, Urine Analysis. 🧪 emoji shown.  
> (This type is not covered in TC-TRES-07 which only covers Blood Test.)

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-TRES-001 | Implement Download PDF handler | 🐛 Bug Fix | 🔴 High |
| SUG-TRES-002 | Implement Order Test handler | 🐛 Bug Fix | 🔴 High |
| SUG-TRES-003 | Fix unknown flag chip bgcolor | 🛡 Guard | 🔴 High |
| SUG-TRES-004 | Add Reset Filters button | ✨ UX | 🟡 Medium |
| SUG-TRES-005 | Add column sorting | ✨ Feature | 🟡 Medium |
| SUG-TRES-006 | Add loading skeleton | ⚡ Performance | 🟡 Medium |
| SUG-TRES-007 | Add "low" flag test data | 🧪 Test Data | 🟡 Medium |

### Quick Wins (1–3 lines):
- **SUG-TRES-003**: `const flagColor = FLAG_COLORS[v.flag] || '#64748B'` — 1 line fix
- **SUG-TRES-004**: Reset button conditional render — ~8 lines
