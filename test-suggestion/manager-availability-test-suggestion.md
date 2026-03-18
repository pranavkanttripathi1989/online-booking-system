# Manager Availability — Test Suggestions

**Derived from:** [manager-availability-test-results.md](../test-result/manager-availability-test-results.md)  
**Source File:** `frontend/src/pages/manager/Availability.jsx`  
**Date:** 2026-03-17

---

## 🔴 Critical Fixes Required Before Testing

### SUG-AVAIL-001 — Fix: `useMutation(GET_ROOMS_FOR_CLINIC)` → `useLazyQuery`
**File:** `Availability.jsx` — Line 118  
**Impact:** Page doesn't render at all. Blocks all 22 test cases.  
**Fix:**
```diff
- import { useQuery, useMutation, gql } from '@apollo/client'
+ import { useQuery, useLazyQuery, useMutation, gql } from '@apollo/client'

- const [getRooms] = useMutation(GET_ROOMS_FOR_CLINIC)
+ const [getRooms, { data: roomsData, loading: roomsLoading }] = useLazyQuery(GET_ROOMS_FOR_CLINIC)
```
**Effort:** 2 lines. Should be done immediately.

---

### SUG-AVAIL-002 — Fix: Room Loading Uses Wrong Query (`refetch` instead of `getRooms`)
**File:** `Availability.jsx` — Lines 124–134  
**Impact:** Room dropdown always shows empty even after the crash fix.  
**Current (broken):**
```js
const loadRoomsForClinic = useCallback(async (clinicId) => {
  setRoomsLoading(true)
  try {
    const result = await refetch()  // ← This re-runs the MAIN query, not the rooms query!
    setRooms([])                    // ← Always sets rooms to empty
  } catch { } finally { setRoomsLoading(false) }
}, [refetch])
```
**Fix — call `getRooms` and use its result:**
```js
const loadRoomsForClinic = useCallback(async (clinicId) => {
  if (!clinicId) { setRooms([]); return }
  const { data } = await getRooms({ variables: { clinicId } })
  setRooms(data?.rooms?.filter(r => r.isActive) ?? [])
}, [getRooms])
```
**Effort:** 5 lines. High priority — rooms are a key form field.

---

### SUG-AVAIL-003 — Fix: Clinic Change Must Reset `room_id`
**File:** `Availability.jsx` — Line 288  
**Impact:** Stale room from a previous clinic is silently sent in the mutation.  
**Fix:**
```diff
- onChange={e => setField('clinic_id', e.target.value)}
+ onChange={e => setForm(prev => ({ ...prev, clinic_id: e.target.value, room_id: '' }))}
```
**Effort:** 1 line.

---

### SUG-AVAIL-004 — Fix: Frontend Guard for Empty Required Dropdowns
**File:** `Availability.jsx` — `handleSubmit` (line 187)  
**Impact:** Mutation fires with empty `clinician_id` / `clinic_id` — backend rejects but UX is broken.  
**Fix:**
```js
const handleSubmit = async (e) => {
  e.preventDefault()
  setFormError(null)
  // Frontend guard:
  if (!form.clinician_id) { setFormError('Please select a clinician.'); return }
  if (!form.clinic_id)    { setFormError('Please select a clinic.'); return }
  // ... rest of submit
}
```
**Effort:** 4 lines.

---

## 🟡 UX / Validation Improvements

### SUG-AVAIL-005 — Add Frontend Time Validation (End ≤ Start)
**Corresponds to Edge Cases E3, E4**  
**Fix:**
```js
if (form.start_time >= form.end_time) {
  setFormError('End time must be after start time.')
  return
}
```
**Effort:** 3 lines. Prevents unnecessary backend round-trips.

---

### SUG-AVAIL-006 — Add Valid Date Range Validation (Until Before From)
**Corresponds to Edge Case E5**  
**Fix:**
```js
if (form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
  setFormError('"Valid Until" cannot be before "Valid From".')
  return
}
```
**Effort:** 3 lines.

---

### SUG-AVAIL-007 — Add React Error Boundary Around the Page
**Impact:** Any future component crash shows a helpful error UI instead of a blank page.  
**Fix:**
```jsx
// In the route config or as a wrapper in Availability.jsx:
import ErrorBoundary from '../../components/ErrorBoundary'

<ErrorBoundary fallback={<Alert severity="error">Availability page failed to load. Please refresh.</Alert>}>
  <ManagerAvailability />
</ErrorBoundary>
```
**Effort:** Low — if ErrorBoundary component already exists elsewhere, reuse it. Otherwise create a simple one.

---

### SUG-AVAIL-008 — Custom Dates: Validate Format Before Submit
**Corresponds to Edge Case E7**  
**Fix:**
```js
if (form.recurrence_type === 'custom' && form.custom_dates) {
  const dates = form.custom_dates.split(',').map(d => d.trim())
  const valid = dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
  if (!valid) { setFormError('Custom dates must be in YYYY-MM-DD format, comma-separated.'); return }
}
```
**Effort:** 5 lines.

---

## 🚀 Test Plan Improvement Suggestions

### SUG-AVAIL-009 — Add Test Case: Verify Room Dropdown Populates After Clinic Selection
The current test plan (TC-MGR-AVAIL-10 and -11) checks that room is disabled before clinic selection and resets on change — but there's **no test case verifying that rooms actually populate** after a clinic is selected (which is broken via BUG-AVAIL-004). Add:

> **TC-MGR-AVAIL-10B** — Room Dropdown Loads Clinic Rooms  
> Select Clinic. Assert: Room dropdown becomes enabled AND shows actual room options (not just "Any room").

---

### SUG-AVAIL-010 — Add Test Case: Verify `useLazyQuery` Fix Works (Room Loading)
After fixing BUG-AVAIL-001 and BUG-AVAIL-002, a regression test should confirm:
> - Clinic A selected → rooms for Clinic A appear  
> - Clinic changed to B → rooms for Clinic B load (not Clinic A's rooms)

---

### SUG-AVAIL-011 — Add Test Case: Submit with Start Time = End Time
The test plan lists this as Edge Case E3 but doesn't have a formal TC. Add:
> **TC-MGR-AVAIL-23** — Start=End Time Blocked  
> Set Start=09:00, End=09:00. Click Create. Assert: frontend error "End time must be after start time." (post-fix) or backend userError shown.

---

### SUG-AVAIL-012 — Add Test Case: Pagination / Large Dataset
The test plan lists E11 (200+ records) in edge cases only. Add formal browser test:
> **TC-MGR-AVAIL-24** — Table Horizontal Scroll with Many Rows  
> Mock 50+ records. Navigate to page. Assert: table scrolls horizontally without layout break.

---

### SUG-AVAIL-013 — Add Test Case: Tab Navigation (Switching Pages and Back)
Edge Case E10 mentions "opening form, switching tabs, and returning" — this should be a formal TC:
> **TC-MGR-AVAIL-25** — Form Persists During Tab Switch  
> Open form, partially fill it, navigate away (e.g., /manager/services), return to /manager/availability. Assert: form re-opens in default state (not retaining partial data from previous session).

---

### SUG-AVAIL-014 — Add Mock Data for Offline Testing
Currently the availability page has no mock data fallback (unlike Patients, Staff, Calendar pages). When backend is offline, `data?.availabilities` is `undefined` → empty array. This means all table-dependent tests require a live backend or mocked Apollo responses in tests.

**Suggestion:** Add `MOCK_AVAILABILITIES` to `frontend/src/mocks/store.js` and apply the same pattern used in Staff/Patients pages:
```js
const availabilities = data?.availabilities ?? MOCK_AVAILABILITIES
const clinicians     = (data?.clinicians ?? MOCK_CLINICIANS).filter(c => c.isActive)
const clinics        = data?.clinics ?? MOCK_CLINICS
```

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-AVAIL-001 | Fix `useMutation(query)` → `useLazyQuery` | 🐛 Critical Fix | 🔴 Critical | 2 lines |
| SUG-AVAIL-002 | Fix room loading (call `getRooms` not `refetch`) | 🐛 Bug Fix | 🔴 High | 5 lines |
| SUG-AVAIL-003 | Reset `room_id` on clinic change | 🐛 Bug Fix | 🟡 Medium | 1 line |
| SUG-AVAIL-004 | Frontend guard for empty required dropdowns | 🐛 Bug Fix | 🟡 Medium | 4 lines |
| SUG-AVAIL-005 | End time ≤ Start time frontend validation | ✨ UX | 🟡 Medium | 3 lines |
| SUG-AVAIL-006 | Valid date range validation | ✨ UX | 🟡 Medium | 3 lines |
| SUG-AVAIL-007 | Add React Error Boundary | 🛡 Resilience | 🟡 Medium | Low |
| SUG-AVAIL-008 | Custom dates format validation | ✨ UX | 🟢 Low | 5 lines |
| SUG-AVAIL-009 | New TC for room dropdown populating | 🧪 Test Coverage | 🟡 Medium | — |
| SUG-AVAIL-010 | Regression TC for room lazy query fix | 🧪 Test Coverage | 🟡 Medium | — |
| SUG-AVAIL-011 | Formal TC for Start=End time | 🧪 Test Coverage | 🟡 Medium | — |
| SUG-AVAIL-012 | Formal TC for 200+ records pagination | 🧪 Test Coverage | 🟢 Low | — |
| SUG-AVAIL-013 | TC for form state after tab navigation | 🧪 Test Coverage | 🟢 Low | — |
| SUG-AVAIL-014 | Add mock data fallback for offline testing | 🧪 Test Infra | 🟡 Medium | Low |
