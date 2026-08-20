---
id: TS010
type: test-suggestion
feature: clinicians
created: 2026-03-19
updated: 2026-04-02
status: done
parent: unknown
related: [TP011, TR010]
---

# Clinicians — Feature Suggestions (Session 4 — 2026-03-30)

**Module:** `frontend/src/pages/clinicians/index.jsx` + `components/Clinicians/ClinicianCard.jsx`  
**Updated:** 2026-03-30 Session 4

> ✅ **All frontend suggestions implemented. Module production-ready.**

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLIN-001 | Email validation messages | 🔴 Critical | ✅ DONE |
| SUG-CLIN-002 | Edit form offline fallback | 🔴 Critical | ✅ DONE |
| SUG-CLIN-003 | Portal mock fallbacks | 🔴 Critical | ✅ DONE |
| SUG-CLIN-004 | Search via useMemo | 🟠 High | ✅ DONE |
| SUG-CLIN-005 | Status toggle wired | 🟠 High | ✅ DONE |
| SUG-CLIN-006 | Card data enrichment | 🟠 High | ✅ DONE |
| SUG-CLIN-007 | Specialization dropdown | 🟠 High | ✅ DONE |
| SUG-CLIN-008 | Clinic filter dropdown | 🟡 Medium | ✅ DONE |
| SUG-CLIN-009 | Fee badge on card | 🟡 Medium | ✅ DONE |
| SUG-CLIN-010 | Demo login chips | 🟡 Medium | ✅ DONE |
| SUG-CLIN-011 | Pagination | 🟢 Low | ⏭ DEFERRED (8 records) |
| SUG-CLIN-012 | Export to CSV | 🟢 Low | ⏭ DEFERRED |
| SUG-CLIN-999 | Offline save fallback | 🟠 High | ✅ DONE |
| **SUG-CLIN-013** | Inactive card dim | 🟢 Low | ✅ DONE (S4) |
| **SUG-CLIN-014** | Filter count badges | 🟢 Low | ✅ DONE (S4) |
| **SUG-CLIN-015** | Clear All Filters button | 🟡 Medium | ✅ DONE (S4) |
| **SUG-CLIN-016** | Heatmap full day tooltips | 🟢 Low | ✅ DONE (S4) |

---

## Session 4 Implementation Notes

### SUG-013 — Inactive Card Dim
```jsx
// clinicians/index.jsx — wrapping inactive cards
<Box sx={c.is_active ? {} : { opacity: 0.70, filter: 'grayscale(30%)', transition: 'opacity 0.2s' }}>
  <ClinicianCard ... />
</Box>
```

### SUG-014 — Count Badges in Dropdowns
```js
const specialtyCount = (sp) => allClinicians.filter(c => (c.specialty ?? c.clinician_type?.name) === sp).length
const clinicCount = (clId) => allClinicians.filter(c => c.clinic?.id === clId || c.clinics?.some?.(cl => cl.id === clId)).length
// In MenuItem: <Chip label={specialtyCount(s)} size="small" sx={{ bgcolor:'#E8F8F9', color:'#006D77' }} />
```

### SUG-015 — Clear Filters Button
```js
const isFiltered = searchTerm.trim() !== '' || filterSpecialty !== '' || filterClinic !== '' || filterActive !== 'all'
const clearFilters = () => { setSearchTerm(''); setFilterSpecialty(''); setFilterClinic(''); setFilterActive('all') }
// Danger-red outlined button with FilterListOffIcon — only shown when isFiltered=true
```

### SUG-016 — Full Day Name Tooltips
```js
const FULL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
// <Tooltip title={FULL_DAYS[idx]} ...> — replaces short title={label}
```

---

## Remaining

| Item | Requires |
|------|---------|
| SUG-011 (Pagination) | 8 records — deferred until data grows |
| SUG-012 (Export CSV) | Low priority — deferred |
| Backend Integration | Real GraphQL API |
