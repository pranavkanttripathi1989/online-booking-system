# Clinician Availability — Test Suggestions

**Derived from:** [clinician-availability-test-results.md](../test-result/clinician-availability-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Availability.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-CLAVAIL-001 — Implement Lunch Break Actions (BUG-CLAVAIL-002)

**Problem:** The "Add Break", Edit icon, and Delete icon in the Lunch Breaks section have no `onClick` handlers. The entire lunch break management feature is non-functional.

**Fix Phase 1 — Add State:**
```js
const [lunchDrawerOpen, setLunchDrawerOpen] = useState(false);
const [editLunch, setEditLunch] = useState(null);
const [newLunch, setNewLunch] = useState({ day_of_week: 'daily', start_time: dayjs().hour(12).minute(0), end_time: dayjs().hour(13).minute(0) });
```

**Fix Phase 2 — Wire handlers:**
```jsx
// Add Break button (line 334):
<Button onClick={() => { setEditLunch(null); setLunchDrawerOpen(true); }} ...>Add Break</Button>

// Edit icon (line 351):
<IconButton onClick={() => { setEditLunch(lb); setLunchDrawerOpen(true); }}>
  <Edit fontSize="small" />
</IconButton>

// Delete icon (line 352):
<IconButton color="error" onClick={async () => {
  if (window.confirm('Delete this lunch break?')) {
    await deleteLunchBreak({ variables: { id: lb.id } });
    refetch();
  }
}}>
  <DeleteOutline fontSize="small" />
</IconButton>
```

**Fix Phase 3 — Add SAVE_LUNCH_BREAK mutation:**
```js
const SAVE_LUNCH_BREAK = gql`
  mutation SaveLunchBreak($input: LunchBreakInput!) {
    saveLunchBreak(input: $input) { id }
  }
`;
```

**Priority:** 🔴 High | **Effort:** Medium (requires new Drawer component for lunch breaks)

---

### SUG-CLAVAIL-002 — Add Mock Fallback for Offline State (BUG-CLAVAIL-001)

**Problem:** `if (avError) return <Box><Alert>{avError.message}</Alert></Box>` replaces the entire component — no grid, no "Add Slot" buttons, no lunch breaks section when backend is offline.

**Fix — Show soft warning + mock data:**
```js
// Mock data for offline/development scenario
const MOCK_AVAILABILITY = [
  { id: 'av1', dayOfWeek: '0', startTime: '09:00', endTime: '17:00', recurrenceType: 'weekly', validFrom: null, validUntil: null, roomId: null },
  { id: 'av2', dayOfWeek: '2', startTime: '09:00', endTime: '17:00', recurrenceType: 'weekly', validFrom: null, validUntil: null, roomId: null },
  { id: 'av3', dayOfWeek: '4', startTime: '09:00', endTime: '13:00', recurrenceType: 'weekly', validFrom: null, validUntil: null, roomId: null },
]
const MOCK_LUNCHES = [
  { id: 'lb1', dayOfWeek: 'daily', startTime: '12:30', endTime: '13:30' }
]
```

```jsx
// In component, replace hard early-return:
// BEFORE:
if (avError) return <Box p={4}><Alert severity="error">{avError.message}</Alert></Box>;

// AFTER:
const availabilities = useMemo(() =>
  avData?.getClinicianAvailability || (avError ? MOCK_AVAILABILITY : []), [avData, avError]);
const lunchBreaks = useMemo(() =>
  avData?.getLunchBreaks || (avError ? MOCK_LUNCHES : []), [avData, avError]);

// Show warning banner above the grid instead:
{avError && (
  <Alert severity="warning" sx={{ mb: 3 }}>
    Could not connect to server — showing demo data. {avError.message}
  </Alert>
)}
```

**Priority:** 🔴 High | **Enables:** All 18 TCs to be browser-testable offline

---

### SUG-CLAVAIL-003 — Replace Native alert/confirm with MUI Components (BUG-CLAVAIL-003)

**Problem:** 
- Line 180: `alert("Failed to save availability. Check console.")` — native browser alert, unstyled
- Line 187: `window.confirm("Delete this availability slot?")` — native browser confirm, unstyled

Both break the MUI design language used throughout the app.

**Fix 1 — Replace save error alert with snackbar:**
```js
// Add to imports:
import { useSnackbar } from 'notistack'; // already used in other modules
const { enqueueSnackbar } = useSnackbar();

// In handleSave catch:
catch (err) {
  console.error(err);
  enqueueSnackbar('Failed to save availability: ' + err.message, { variant: 'error' });
}
```

**Fix 2 — Replace window.confirm with ConfirmDialog:**
```jsx
// Import ConfirmDialog (already exists in other modules):
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

// State:
const [deleteTarget, setDeleteTarget] = useState(null);

// Delete button:
<Button color="error" onClick={() => setDeleteTarget(editSlot.id)}>Delete</Button>

// Dialog:
<ConfirmDialog
  isOpen={!!deleteTarget}
  title="Delete Slot"
  message="Delete this availability slot? This cannot be undone."
  onConfirm={async () => {
    await deleteAvailabilitySlot(deleteTarget);
    setDeleteTarget(null);
  }}
  onCancel={() => setDeleteTarget(null)}
/>
```

**Priority:** 🟡 Medium | **Effort:** 20 lines

---

## 🟡 Medium Priority — Validation & Safety Gaps

### SUG-CLAVAIL-004 — Add Validation: Valid Until Before Valid From (E3)

**Problem:** DatePickers for `valid_from` and `valid_until` have no cross-validation. User can set "Valid Until" before "Valid From" — no error shown.

**Fix (in drawer, after the date pickers):**
```jsx
{formData.valid_from && formData.valid_until && formData.valid_until.isBefore(formData.valid_from) && (
  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
    "Valid Until" must be after "Valid From"
  </Alert>
)}
```

Also disable Save Slot:
```jsx
const isDateRangeInvalid = formData.valid_from && formData.valid_until &&
  formData.valid_until.isBefore(formData.valid_from);

disabled={saving || formData.end_time.isBefore(formData.start_time) || isDateRangeInvalid}
```

**Priority:** 🟡 Medium

---

### SUG-CLAVAIL-005 — Add Unsaved Changes Warning on Drawer Close (E5)

**Problem:** Closing the drawer (backdrop click or ✕) silently discards all form changes. No warning shown.

**Fix:**
```js
const handleCloseDrawer = () => {
  const hasChanges = editSlot
    ? /* compare formData vs editSlot fields */
    : form.name || form.start_time !== defaultStart; // simplified
  
  if (hasChanges && !window.confirm('Discard unsaved changes?')) return;
  setDrawerOpen(false);
  setEditSlot(null);
};
```

Or simpler: compare `JSON.stringify(formData)` with a `savedSnapshot` ref.

**Priority:** 🟡 Medium

---

### SUG-CLAVAIL-006 — Add Availability Link to Clinician Sidebar (OBS-2)

**Problem:** Clinician sidebar has no "Availability" navigation link. Users must type the URL manually — poor discoverability.

**Fix:** Add to the clinician sidebar/nav component:
```jsx
<NavItem to="/clinician/availability" icon={<EventAvailableIcon />} label="Availability" />
```

**Priority:** 🟡 Medium | **Effort:** 3 lines in sidebar component

---

### SUG-CLAVAIL-007 — Improve Slot Conflict Detection (E4)

**Problem:** No frontend overlap detection. Clinicians can create two slots on the same day at the same time — the grid shows them stacked with no warning.

**Suggested fix:**
```js
const hasOverlap = (newSlot, existingSlots) => {
  return existingSlots.some(slot => {
    if (slot.id === newSlot.id) return false; // skip self
    if (slot.dayOfWeek !== newSlot.dayOfWeek && newSlot.recurrenceType !== 'daily') return false;
    const newStart = newSlot.startTime;
    const newEnd = newSlot.endTime;
    return newStart < slot.endTime && newEnd > slot.startTime;
  });
};
```

Show a warning (not blocking) Alert in the drawer when overlap detected.

**Priority:** 🟡 Medium

---

## 🟢 Low Priority — UX Improvements

### SUG-CLAVAIL-008 — Minimum Spinner Visibility

**Problem:** Spinner (CircularProgress) during initial load is barely visible because the error resolves instantly on fast connections.

```js
// Add minimum display time:
const [minSpinnerDone, setMinSpinnerDone] = useState(false);
useEffect(() => {
  const t = setTimeout(() => setMinSpinnerDone(true), 400);
  return () => clearTimeout(t);
}, []);

if (avLoading || !minSpinnerDone) return <CircularProgress />;
```

**Priority:** 🟢 Low

---

### SUG-CLAVAIL-009 — Room Dropdown: Show Room Number

**Problem:** Room dropdown only shows `r.name` (line 455): `{r.name} (Room {r.roomNumber})`. If `r.name` is null/undefined, only "(Room X)" shows.

**Fix:** Add null guard: `{r.name || 'Unnamed Room'} (Room {r.roomNumber})`.

**Priority:** 🟢 Low

---

### SUG-CLAVAIL-010 — Day Selector: Show Full Name Tooltip

**Problem:** ToggleButtons only show single letters M/T/W/T/F/S/S (lines 405–411). Thursday and Tuesday are both "T". Sunday and Saturday are both "S" — confusing.

**Fix:**
```jsx
<ToggleButton value="0"><Tooltip title="Monday"><span>M</span></Tooltip></ToggleButton>
<ToggleButton value="1"><Tooltip title="Tuesday"><span>Tu</span></Tooltip></ToggleButton>
// etc.
```

Or use 2-letter abbreviations: M, Tu, W, Th, F, Sa, Su.

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Scenarios

### SUG-CLAVAIL-PLAN-001 — Add TC: Slot Sort Order in Column

> **TC-CLAVAIL-03B** — Slots sorted by start time  
> With multiple overlapping/sequential slots in a column, verify they are displayed sorted by `startTime` (source line 214: `.sort((a, b) => a.startTime.localeCompare(b.startTime))`). Lunch and availability slots both included in sorted list.

### SUG-CLAVAIL-PLAN-002 — Add TC: "Daily" Recurrence Slot Appears in All Columns

> **TC-CLAVAIL-03C** — Daily slots shown in every column  
> Source line 202–204: `a.recurrenceType === 'daily'` — daily slots appear in ALL 7 columns. Verify a "daily" slot appears in each of Mon–Sun columns simultaneously.

### SUG-CLAVAIL-PLAN-003 — Add TC: Drawer Width + Rounded Corners

> **TC-CLAVAIL-05B** — Drawer dimensions  
> Drawer PaperProps `sx={{ width: { xs: '100%', sm: 480 }, borderRadius: '24px 0 0 24px' }}` (line 364). On mobile (xs): full-width. On sm+: 480px. Test responsiveness.

### SUG-CLAVAIL-PLAN-004 — Add TC: Tooltip on Slot Hover

> **TC-CLAVAIL-04B** — Slot hover tooltip  
> Source line 268: `<Tooltip title="Edit {startTime} - {endTime} in {roomName}">`. Hover over slot. Verify tooltip shows formatted time range + room name.

### SUG-CLAVAIL-PLAN-005 — Add TC: Room Name Fallback in Grid

> **TC-CLAVAIL-03D** — No room → "Consulting Room" fallback  
> Source line 265: `rooms.find(r => r.id === item.roomId)?.name || 'Consulting Room'` — if room not found, show "Consulting Room". Test with a slot that has `roomId` not present in rooms list.

### SUG-CLAVAIL-PLAN-006 — Add TC: Lunch Break is_Lunch Detection Logic

> **TC-CLAVAIL-03E** — Lunch break detection  
> Source line 240: `const isLunch = item.__typename === 'LunchBreak' || item.id?.includes('lunch')` — `__typename` from Apollo or `id` containing 'lunch' string. Verify that Apollo correctly sets `__typename: 'LunchBreak'` for lunch items returned by query, otherwise the detection falls back to an id string check which may be unreliable.

### SUG-CLAVAIL-PLAN-007 — Add TC: Cancelling During "Saving..." State

> **TC-CLAVAIL-09B** — Cancel disabled during save  
> Source line 502: `<Button onClick={handleCloseDrawer} disabled={saving}>Cancel</Button>`. While saving, Cancel is disabled. Test by clicking Save and immediately trying Cancel — button should be unresponsive.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-CLAVAIL-001 | Implement lunch break actions | 🐛 Bug Fix | 🔴 High |
| SUG-CLAVAIL-002 | Add mock fallback for offline state | 🧪 Test Infra | 🔴 High |
| SUG-CLAVAIL-003 | Replace native alert/confirm with MUI | 🐛 UX Bug | 🟡 Medium |
| SUG-CLAVAIL-004 | Valid Until < Valid From validation | 🛡 Validation | 🟡 Medium |
| SUG-CLAVAIL-005 | Unsaved changes warning on drawer close | ✨ UX | 🟡 Medium |
| SUG-CLAVAIL-006 | Add Availability to clinician sidebar | 🧭 Navigation | 🟡 Medium |
| SUG-CLAVAIL-007 | Slot conflict/overlap detection | 🛡 Validation | 🟡 Medium |
| SUG-CLAVAIL-008 | Minimum spinner visibility | ✨ UX | 🟢 Low |
| SUG-CLAVAIL-009 | Null guard for room name | 🐛 Visual | 🟢 Low |
| SUG-CLAVAIL-010 | Day selector: Tu/Th/Sa/Su disambiguation | ✨ UX | 🟢 Low |
