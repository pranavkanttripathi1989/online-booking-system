# Patient Appointments — Test Suggestions

**Derived from:** [patient-appointments-test-results.md](../test-result/patient-appointments-test-results.md)  
**Source File:** `frontend/src/pages/patient/Appointments.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-PTAPPT-001 — Implement Cancel Appointment with Confirm Dialog (TC-PTAPPT-10)

**Problem:** `onCancel={(id) => console.log('cancel', id)}` — clicking Cancel fires a console.log only. No UI feedback, no state change, no dialog.

**Fix:**
```jsx
const [cancelId, setCancelId] = useState(null);
const [appointments, setAppointments] = useState(APPOINTMENTS);

const handleCancel = (id) => {
  // Filter out the cancelled appointment or update its status
  setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  setCancelId(null);
};

// In onCancel:
onCancel={(id) => setCancelId(id)}

// Add confirmation Dialog:
<Dialog open={Boolean(cancelId)} onClose={() => setCancelId(null)}>
  <DialogTitle>Cancel Appointment?</DialogTitle>
  <DialogContent>
    <Typography>Are you sure you want to cancel this appointment? This action cannot be undone.</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setCancelId(null)}>Keep Appointment</Button>
    <Button color="error" onClick={() => handleCancel(cancelId)}>Yes, Cancel</Button>
  </DialogActions>
</Dialog>
```

**Priority:** 🔴 High | **Effort:** ~25 lines

---

### SUG-PTAPPT-002 — Implement Sort Dropdown Logic (TC-PTAPPT-17)

**Problem:** Sort dropdown is uncontrolled (`defaultValue` only). No `onChange`, no sort logic. Selecting Doctor/Price has zero effect.

**Fix:**
```jsx
const [sortBy, setSortBy] = useState('date');

const sorted = [...filtered].sort((a, b) => {
  if (sortBy === 'doctor')  return a.doctor.localeCompare(b.doctor);
  if (sortBy === 'price')   return a.price - b.price;
  return new Date(a.date) - new Date(b.date); // default: date
});

// Update Select:
<Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
  <MenuItem value="date">Date</MenuItem>
  <MenuItem value="doctor">Doctor</MenuItem>
  <MenuItem value="price">Price</MenuItem>
</Select>
```

**Priority:** 🔴 High | **Effort:** ~10 lines

---

### SUG-PTAPPT-003 — Implement Receipt Download/View (Edge Case E5)

**Problem:** Receipt button has no `onClick`. Clicking it does nothing.

**Fix:**
```jsx
const handleReceipt = (appt) => {
  // In production: fetch receipt PDF from backend
  // For mock: show a simple modal or navigate to receipt page
  navigate(`/patient/appointments/${appt.id}/receipt`);
};

// Update Receipt button:
<Button
  variant="outlined" size="small" startIcon={<DownloadIcon />}
  onClick={() => handleReceipt(appt)}
>
  Receipt
</Button>
```

**Priority:** 🔴 High | **Effort:** ~5 lines

---

### SUG-PTAPPT-004 — Clear Search on Tab Switch (Edge Case E4)

**Problem:** `search` state is shared across Upcoming and Past tabs. Searching "sarah" on Upcoming and switching to Past keeps "sarah" — the filter persists, causing unexpected empty states on Past tab.

**Fix — Reset search on tab change:**
```jsx
<Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }}>
```

**Or** — use separate search per tab:
```jsx
const [upcomingSearch, setUpcomingSearch] = useState('');
const [pastSearch, setPastSearch] = useState('');
const search = tab === 0 ? upcomingSearch : pastSearch;
const setSearch = tab === 0 ? setUpcomingSearch : setPastSearch;
```

**Priority:** 🔴 High | **Effort:** 1 line (simple fix)

---

### SUG-PTAPPT-005 — Add Null Guard for Price (Edge Case E2)

**Problem:** Line 79: `` £{appt.price} `` — if an appointment has no price set, shows "£undefined" to the user.

**Fix:**
```jsx
<Typography variant="body2" color="primary" fontWeight={700}>
  {appt.price != null ? `£${appt.price}` : 'Price TBD'}
</Typography>
```

**Priority:** 🔴 High | **Effort:** 1 line

---

## 🟡 Medium Priority — UX Improvements

### SUG-PTAPPT-006 — Add Doctor Name Text Overflow Guard (Edge Case E3)

**Problem:** Doctor name has no `noWrap` or `maxWidth`. A very long name (e.g., "Dr. Constantinos-Alexopoulos-Papadopoulos") would overflow or wrap awkwardly in the card grid.

**Fix:**
```jsx
<Typography fontWeight={700} noWrap sx={{ maxWidth: 260 }}>
  {appt.doctor}
</Typography>
```

**Priority:** 🟡 Medium | **Effort:** 2 lines

---

### SUG-PTAPPT-007 — Use Dynamic `upcoming`/`past` After Cancellation

**Problem:** `upcoming` and `past` arrays are derived from the static `APPOINTMENTS` constant (line 118–119). After implementing live cancellation (SUG-001), the subtitle "2 upcoming · 2 past" and tab counts won't update unless `APPOINTMENTS` is converted to state.

**Fix:**
```jsx
const [appointments, setAppointments] = useState(APPOINTMENTS);
const upcoming = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status));
const past     = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));
```

**Priority:** 🟡 Medium | **Companion to:** SUG-PTAPPT-001

---

### SUG-PTAPPT-008 — Add Sort Descending Toggle

Once sort is implemented (SUG-002), add ascending/descending toggle:
```jsx
const [sortDir, setSortDir] = useState('asc');
// sorted array: sortDir === 'desc' ? sorted.reverse() : sorted
```

**Priority:** 🟡 Medium

---

### SUG-PTAPPT-009 — Connect to Apollo Query for Real Data

**Problem:** All functionality is mock-data only. No `GET_APPOINTMENTS` query, no `CANCEL_APPOINTMENT` mutation. Backend integration needed for production.

**Suggested query:**
```graphql
query GetMyAppointments {
  myAppointments {
    id date time status type price
    clinician { firstName lastName specialization }
    clinic { name }
    service { name }
  }
}
```

**Priority:** 🟡 Medium (production requirement)

---

## 🟢 Low Priority — Test Plan Corrections

### SUG-PTAPPT-010 — Correct TC-PTAPPT-05 Plan Wording

**Problem:** TC-PTAPPT-05 states "Clinic shown as 'Online'" — this is inaccurate. The chip label is "Video" (not "Online"). The `clinic` field in mock data is "Online" but the JSX uses `type === 'video' ? 'Video' : appt.clinic`, so users only see "Video".

**Fix in test plan:** Change "Clinic shown as 'Online'" to "Chip label shows 'Video' (type-based override)".

---

## Additional Test Cases

### SUG-PTAPPT-PLAN-001 — TC: Cancel + UI State Update

> **TC-PTAPPT-18** — Cancel appointment updates UI  
> (After SUG-001 fix) Click Cancel → confirm in dialog → appointment moves to Past tab with "cancelled" status.  
> Subtitle updates: "1 upcoming · 3 past".

### SUG-PTAPPT-PLAN-002 — TC: Sort by Date (Default)

> **TC-PTAPPT-19** — Sort by Date (default)  
> Upcoming cards should be in ascending date order by default.  
> Dr. Sarah Johnson (2026-03-20) before Dr. Marcus Osei (2026-03-25). Currently correct.

### SUG-PTAPPT-PLAN-003 — TC: Sort by Doctor

> **TC-PTAPPT-20** — Sort by Doctor alphabetically  
> Select Doctor sort. Expected order on Past tab: Dr. Priya Sharma before Dr. Sarah Johnson (P before S alphabetically).  
> Current bug: order unchanged. After SUG-002 fix.

### SUG-PTAPPT-PLAN-004 — TC: Sort by Price

> **TC-PTAPPT-21** — Sort by Price ascending  
> Select Price sort on Past tab. Dr. Priya Sharma (£75) before Dr. Sarah Johnson (£120).

### SUG-PTAPPT-PLAN-005 — TC: Search Persists Within Tab Switch (Bug Repro)

> **TC-PTAPPT-22** — Search cross-tab contamination (edge case E4)  
> Type "sarah" in search on Upcoming. Switch to Past tab.  
> **Actual (bug):** "sarah" persists, Past tab filters to show only Sarah's completed appointment.  
> **Expected (after fix):** Search cleared; both past appointments shown.

### SUG-PTAPPT-PLAN-006 — TC: Appointment Card Initials Avatar

> **TC-PTAPPT-23** — Doctor avatar initials  
> All 4 appointments have `initials` field: SJ, MO, SJ, PS.  
> Verify: Avatar shows correct initials with teal bgcolor (#006D77).

### SUG-PTAPPT-PLAN-007 — TC: Past Tab Border Colors

> **TC-PTAPPT-24** — Past tab status border colors  
> Completed (ECG Recording): light blue border (#D0E8EA).  
> Cancelled (Annual Check-up): red border (#E63946).  
> Source line 47: final fallback `'#D0E8EA'` for completed.

### SUG-PTAPPT-PLAN-008 — TC: Price Display Formatting

> **TC-PTAPPT-25** — Price shows GBP £ symbol  
> All 4 appointments show price with `£` prefix: £85, £95, £120, £75.  
> Source line 79: `£{appt.price}` — no `toLocaleString()` formatting (plain number, no commas for large values).

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-PTAPPT-001 | Cancel with confirm dialog + state update | 🐛 Bug Fix | 🔴 High |
| SUG-PTAPPT-002 | Implement sort dropdown logic | 🐛 Bug Fix | 🔴 High |
| SUG-PTAPPT-003 | Receipt button handler | 🐛 Bug Fix | 🔴 High |
| SUG-PTAPPT-004 | Clear search on tab switch | 🐛 Bug Fix | 🔴 High |
| SUG-PTAPPT-005 | Null guard for price £undefined | 🛡 Guard | 🔴 High |
| SUG-PTAPPT-006 | Doctor name text overflow | ✨ UX | 🟡 Medium |
| SUG-PTAPPT-007 | Convert APPOINTMENTS to state | 🏗 Architecture | 🟡 Medium |
| SUG-PTAPPT-008 | Sort direction toggle | ✨ UX | 🟡 Medium |
| SUG-PTAPPT-009 | Backend Apollo integration | 🔗 Integration | 🟡 Medium |
| SUG-PTAPPT-010 | Fix TC-05 plan wording | 📝 Plan Fix | 🟢 Low |

### Quick Wins (1–2 lines):
- **SUG-PTAPPT-004**: Add `setSearch('')` to Tabs onChange (1 line)
- **SUG-PTAPPT-005**: Replace `£{appt.price}` with `£{appt.price ?? 'TBD'}` (1 line)
