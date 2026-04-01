# Clinician Patients — Feature Suggestions (Session 6 — 2026-03-30)

**Module:** `frontend/src/pages/clinician/Patients.jsx`  
**Updated:** 2026-03-30 Session 6

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLPAT-001–015 | All previous items | Various | ✅ DONE |
| SUG-CLPAT-016 | Keyboard Enter/Space on filter chips | ♿ A11y | ✅ DONE (S5) |
| SUG-CLPAT-017 | Mobile KPI horizontal scroll | 📱 | ✅ DONE (S5) |
| NEW-CLPAT-018 | Last Visit "N days ago" tooltip | ✨ UX | ✅ DONE (S5) |
| NEW-CLPAT-019 | "Overdue" badge > 90 days | 🏥 | ✅ DONE (S5) |
| NEW-CLPAT-020 | Keyboard row navigation | ♿ A11y | ✅ DONE (S5) |
| **NEW-CLPAT-021** | Age badge in DOB cell | ✨ UX | ✅ DONE (S6) |
| **NEW-CLPAT-022** | 150ms debounced search | ⚡ Perf | ✅ DONE (S6) |
| **NEW-CLPAT-023** | Export CSV button | ✨ UX | ✅ DONE (S6) |
| SUG-CLPAT-005 | Connect to real backend | 🔗 | ⏳ DEFERRED (backend) |

---

## Session 6 Implementation Notes

### NEW-CLPAT-021 — Age Badge in DOB
```jsx
<Chip label={`${dayjs().diff(dayjs(patient.dob), 'year')}y`} size="small"
  sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.6rem', height: 16 }} />
```

### NEW-CLPAT-022 — Debounced Search
```js
const debounceTimer = useRef(null);
const handleSearch = useCallback((val) => {
  setSearch(val);           // instant input update
  setPage(0);
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 150);
}, []);
// filtered useMemo depends on debouncedSearch not search
```

### NEW-CLPAT-023 — Export CSV
```js
const exportCSV = () => {
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `my-patients-${today}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};
```

---

## Remaining

| Item | Requires |
|------|---------|
| SUG-CLPAT-005 | GraphQL backend API integration |
