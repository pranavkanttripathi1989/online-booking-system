# Manager Clinics — Test Suggestions

**Derived from:** [manager-clinics-test-results.md](../test-result/manager-clinics-test-results.md)  
**Source Files:** `frontend/src/pages/manager/clinics/` (index, create, detail, edit)  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-CLI-001 — Fix: Rooms Total in Subtitle (BUG-CLI-001) ← Quick Fix

**Location:** `index.jsx` line 55  
**Problem:** Shows `ROOMS_DATA.length` = 4 (only the 4 hardcoded preview room cards), not the total rooms across all clinics (5+8+4+3 = 20).

**Fix:**
```jsx
// Before:
{clinics.length} clinics · {ROOMS_DATA.length} rooms total

// After:
{clinics.length} clinics · {clinics.reduce((s, c) => s + c.rooms, 0)} rooms total
```
**Effort:** 1 line  
**Priority:** 🔴 High (incorrect data displayed to users)

---

### SUG-CLI-002 — Fix: Edit Page Blocked by network-only + No Mock Data (BUG-CLI-002)

**Location:** `edit.jsx` line 25, `detail.jsx` line 19  
**Problem:** `fetchPolicy: 'network-only'` bypasses Apollo cache + no mock handler means the page perpetually shows skeleton when backend is offline.

**Fix Option A — Add mock data fallback:**
```js
// In edit.jsx useEffect:
useEffect(() => {
  if (!data?.clinic) return
  // ... existing
}, [data])

// Add mock default in useEffect:
useEffect(() => {
  // If after timeout still no data, use a placeholder
  const timer = setTimeout(() => {
    if (!form) setForm({ name: 'Unknown', address: '', city: '', postcode: '', phone: '', email: '', timezone: 'Europe/London', is_active: true })
  }, 3000)
  return () => clearTimeout(timer)
}, [form])
```

**Fix Option B — Change fetchPolicy for offline safety:**
```js
const { data, loading: fetching } = useQuery(CLINIC_DETAIL_QUERY, {
  variables: { id },
  fetchPolicy: 'cache-first', // Use cache when available, only refetch if stale
})
```

**Fix Option C — Add mock Apollo handler for `CLINIC_DETAIL_QUERY`** in `src/mocks/apolloHandlers.js`.  
**Priority:** 🔴 High (edit page entirely unusable offline)

---

## 🟡 Medium Priority — Feature Gaps

### SUG-CLI-003 — Add Email Format Validation on Create/Edit (Edge Case E6)

**Location:** `create.jsx` and `edit.jsx`  
**Problem:** Email field has `type="email"` (line 74) which allows browser-native email validation, but MUI `TextField` does not trigger browser native validation on button click. Invalid emails are silently accepted.

**Fix — Add email regex check in `validate()`:**
```js
const validate = () => {
  const e = {}
  if (!form.name.trim()) e.name = 'Required'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
  setErrors(e); return !Object.keys(e).length
}

// Apply in JSX:
<TextField
  error={!!errors.email}
  helperText={errors.email}
  label="Email"
  value={form.email}
  onChange={set('email')}
/>
```
**Priority:** 🟡 Medium (data quality issue)

---

### SUG-CLI-004 — Handle Invalid Clinic ID in Detail/Edit (Edge Cases E7, E8)

**Location:** `detail.jsx`, `edit.jsx`  
**Problem:** Navigating to `/manager/clinics/invalid-id` — Apollo returns `null` for `data.clinic`. Detail page just renders blank. Edit page loops in skeleton.

**Fix for detail.jsx:**
```jsx
if (!loading && !clinic) return (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <Typography variant="h5">Clinic not found</Typography>
    <Button onClick={() => navigate('/manager/clinics')}>Back to Clinics</Button>
  </Box>
)
```

**Fix for edit.jsx** (after skeleton timeout):
```js
useEffect(() => {
  if (!fetching && data && !data.clinic) navigate('/manager/clinics')
}, [data, fetching])
```
**Priority:** 🟡 Medium (prevents blank/broken pages for invalid URLs)

---

### SUG-CLI-005 — Persist Deletion to Backend (Index Page Local-State Only)

**Location:** `index.jsx`  
**Problem:** Delete on index page is **local state only** (`setClinics(prev => prev.filter(...))`). After page reload the clinic reappears. There is no `DELETE_CLINIC` mutation call from the index.

**Fix — Wire to backend:**
```js
const [deleteClinic] = useMutation(DELETE_CLINIC_MUTATION, {
  onCompleted: () => {
    setClinics(prev => prev.filter(c => c.id !== deleteId))
    setDeleteId(null)
  }
})

const confirmDelete = () => deleteClinic({ variables: { id: deleteId } })
```
**Priority:** 🟡 Medium (critical when page moves to live data)

---

### SUG-CLI-006 — Wire Index Page to Live Apollo Data

**Location:** `index.jsx`  
**Problem:** `CLINICS_DATA` is hardcoded. KPI cards, clinic grid, search, and delete all use local state. Not connected to backend.

**Fix:**
```js
const { data, refetch } = useQuery(GET_CLINICS_QUERY, { fetchPolicy: 'cache-and-network' })
const [clinics, setClinics] = useState([])
useEffect(() => { if (data?.clinics) setClinics(data.clinics) }, [data])
```
**Priority:** 🔴 High (for production readiness)

---

## 🟢 Low Priority — UX Improvements

### SUG-CLI-007 — Add Whitespace-only Name Validation (Edge Case E5)
**Fix:** `validate()` already uses `form.name.trim()` — this already catches whitespace-only. ✅ Already handled.

### SUG-CLI-008 — Search Query Persists After Tab Switch (E11 Observation)
The search field retains its value when switching to Rooms tab and back — the clinic filter is still applied. This may **confuse users** who expect the search to be cleared or scoped to only clinics.

**Options:**
- A) Clear search when switching tabs: `onClick={() => { setTab(i); setSearch('') }}`
- B) Show search box only when on Clinics tab (hide for Rooms tab)
- C) Label the search to clarify "Filter Clinics by Name"

**Priority:** 🟢 Low (UX polish)

### SUG-CLI-009 — Add Empty Grid State for Search on Clinics Tab
When search returns no matches, the clinic grid shows nothing (empty, no message). Add:
```jsx
{tab === 0 && filtered.length === 0 && (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <Typography color="text.secondary">No clinics match "{search}"</Typography>
    <Button onClick={() => setSearch('')}>Clear Search</Button>
  </Box>
)}
```
**Priority:** 🟢 Low

### SUG-CLI-010 — Add Clinic Card Hover → Show Quick Stats
Currently cards have hover box-shadow. Could enhance with a "quick action" bar appearing on hover: View | Edit | Delete — replacing the always-visible 3 icon buttons.  
**Priority:** 🟢 Low (optional polish)

---

## Test Plan Gaps & Additional Scenarios

### SUG-CLI-PLAN-001 — Add TC: Email with Invalid Format
> **TC-MGR-CLI-18B** — Invalid Email  
> On create: enter "not-an-email" in Email field, click Save.  
> Expected (before fix): mutation fires with invalid email. Expected (after fix): error "Invalid email format" shown.

### SUG-CLI-PLAN-002 — Add TC: Whitespace Name on Create
> **TC-MGR-CLI-18C** — Whitespace Name  
> Enter "   " (spaces only) in Name, click Save.  
> `form.name.trim() === ''` → "Required" error shown. ✅ Already passes — add explicit TC.

### SUG-CLI-PLAN-003 — Add TC: Delete Persistence After Reload
> **TC-MGR-CLI-13B** — Delete is Local Only  
> Delete a clinic from index. Navigate away. Navigate back. Assert: clinic reappears (because delete is local state only).  
> This documents the known limitation until backend mutation is wired.

### SUG-CLI-PLAN-004 — Add TC for Specialties: Zero Specialties (Edge Case E2)
> Create or mock a clinic with `specialties: []`. Assert: specialty chip row renders empty, no crash. Source line 186: `clinic.specialties.map(s => <Chip>)` — with empty array renders nothing.

### SUG-CLI-PLAN-005 — Add TC: Rooms Tab + Rooms count in header
> After fixing SUG-CLI-001, add: Assert subtitle shows "4 clinics · 20 rooms total" for the full mock dataset.

### SUG-CLI-PLAN-006 — Add TC for Edit page with Valid Clinic ID (Backend Live)
> Once backend is available:
> - Navigate to `/manager/clinics/1/edit`
> - Assert: all form fields pre-populated (name, address, city, postcode, phone, email, timezone, is_active switch)
> - Change name to "Updated Name", Save
> - Assert: snackbar "Clinic updated", redirect to `/manager/clinics/1`

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-CLI-001 | Fix rooms total subtitle calculation | 🐛 Bug Fix | 🔴 High | 1 line |
| SUG-CLI-002 | Fix edit page skeleton loop offline | 🐛 Bug Fix | 🔴 High | Low |
| SUG-CLI-003 | Add email format validation | 🛡 Validation | 🟡 Medium | Low |
| SUG-CLI-004 | Handle invalid clinic ID (404) | 🛡 Validation | 🟡 Medium | Low |
| SUG-CLI-005 | Wire delete to backend mutation | 🔌 Backend | 🟡 Medium | Low |
| SUG-CLI-006 | Wire index to Apollo live data | 🔌 Backend | 🔴 High | Medium |
| SUG-CLI-007 | Whitespace name — already handled | ✅ Already OK | — | — |
| SUG-CLI-008 | Clear search on tab switch | ✨ UX | 🟢 Low | 1 line |
| SUG-CLI-009 | Empty state for Clinics tab no-match | ✨ UX | 🟢 Low | Low |
| SUG-CLI-010 | Hover quick action bar | ✨ UX | 🟢 Low | Low |

### Quick Win (< 5 min):
- **SUG-CLI-001**: Change `ROOMS_DATA.length` → `clinics.reduce((s, c) => s + c.rooms, 0)` on index.jsx line 55
