# Manager Blocks — Test Suggestions

**Derived from:** [manager-blocks-test-results.md](../test-result/manager-blocks-test-results.md)  
**Source File:** `frontend/src/pages/manager/Blocks.jsx`  
**Date:** 2026-03-17

---

## 🟡 Medium Priority — Feature Gaps

### SUG-BLK-001 — Add Mock Data for Offline Testing
The Spacer Blocks and Room Blocks page has no mock data fallback. All delete/card display TCs (TC-05, 13–15, 18, 20, 22) cannot be browser-tested without a live backend.  
**Fix:** Add to `src/mocks/store.js`:
```js
export const MOCK_SPACER_BLOCKS = [
  {
    id: 'sb-001',
    clinician_id: 'clin-001', clinic_id: 'clinic-001', room_id: null,
    block_date: '2026-03-17', start_time: '10:00', end_time: '10:15',
    reason: 'Equipment setup', recurrence_type: 'single', recurrence_days: null, end_date: null,
    clinician: { id: 'clin-001', first_name: 'Jane', last_name: 'Smith' },
    clinic: { id: 'clinic-001', name: 'Central Clinic' }, room: null,
  },
]

export const MOCK_ROOM_BLOCKS = [
  {
    id: 'rb-001',
    room_id: 'room-001', clinic_id: 'clinic-001',
    block_date: '2026-03-17', start_time: '08:00', end_time: '09:00',
    reason: 'Deep cleaning', recurrence_type: 'single', recurrence_days: null, end_date: null,
    room: { id: 'room-001', room_number: '1' },
    clinic: { id: 'clinic-001', name: 'Central Clinic' },
  },
]
```
Then in `Blocks.jsx`:
```js
const spacerBlocks = data?.spacerBlocks ?? MOCK_SPACER_BLOCKS
const roomBlocks   = data?.roomBlocks   ?? MOCK_ROOM_BLOCKS
```
**Priority:** 🟡 Medium

---

### SUG-BLK-002 — Add Frontend Time Validation (End ≤ Start)
**Edge Cases E4, E5 — No frontend guard**  
**Fix:** In both `handleSpacerSubmit` and `handleRoomBlockSubmit`:
```js
const handleSpacerSubmit = async (e) => {
  e.preventDefault(); setFormError(null)
  if (spacerForm.start_time >= spacerForm.end_time) {
    setFormError('End time must be after start time.'); return
  }
  // ... rest
}
```
Apply same pattern to room block form. **4 lines total.**  
**Priority:** 🟡 Medium

---

### SUG-BLK-003 — Add Frontend End Date Validation
**Edge Case E6 — End Date before today not caught**  
**Fix:**
```js
if (form.end_date && form.end_date < new Date().toISOString().split('T')[0]) {
  setFormError('"End Date" cannot be in the past.'); return
}
```
**Priority:** 🟡 Medium

---

### SUG-BLK-004 — Validate Custom Recurrence Requires At Least One Day
**Edge Case E3** — submitting with no days selected sends `recurrence_days: []` silently.  
**Fix:**
```js
if (spacerForm.recurrence_type === 'custom' && spacerForm.recurrence_days.length === 0) {
  setFormError('Please select at least one day for custom recurrence.'); return
}
```
**Priority:** 🟡 Medium

---

## 🟢 Low Priority — UX Improvements

### SUG-BLK-005 — Add Reason Field Max Length & Character Counter
**Edge Case E7** — no `maxLength`. Reason can be 1000+ chars and will display in full in the card.  
**Fix:**
```jsx
<TextField
  inputProps={{ maxLength: 200 }}
  helperText={`${spacerForm.reason.length}/200`}
  label="Reason"
/>
```
**Priority:** 🟢 Low

---

### SUG-BLK-006 — Close Spacer Form When Switching to Room Blocks Tab
**Edge Case E13** — spacer form stays open when switching to Room Blocks tab, which is confusing UX.  
**Fix:** Add close on tab switch:
```js
// Line 273 — ToggleButtonGroup onChange:
onChange={(_, v) => {
  if (v) {
    setTab(v)
    setShowSpacerForm(false)  // close spacer form when switching
    setShowRoomForm(false)    // close room form when switching
    setFormError(null)
  }
}}
```
**Priority:** 🟢 Low

---

### SUG-BLK-007 — Add Empty State CTA Button
**Observation:** Empty states show text only ("No spacer blocks yet"). Users could benefit from a secondary CTA.  
**Fix:**
```jsx
{spacerBlocks.length === 0 && (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Typography color="text.secondary" mb={2}>No spacer blocks yet</Typography>
      <Button variant="outlined" startIcon={<AddIcon />}
        onClick={() => setShowSpacerForm(true)}>
        Create your first spacer block
      </Button>
    </CardContent>
  </Card>
)}
```
**Priority:** 🟢 Low

---

### SUG-BLK-008 — Add "Select All / Clear All" for Custom Day Chips
**Observation:** TC-10 — selecting Mon/Wed/Fri requires 3 separate clicks.  
**Fix:**
```jsx
{form.recurrence_type === 'custom' && (
  <>
    <Stack direction="row">
      <Button size="small" onClick={() => setForm(p => ({ ...p, recurrence_days: [0,1,2,3,4,5,6] }))}>All</Button>
      <Button size="small" onClick={() => setForm(p => ({ ...p, recurrence_days: [] }))}>Clear</Button>
      <Button size="small" onClick={() => setForm(p => ({ ...p, recurrence_days: [1,2,3,4,5] }))}>Weekdays</Button>
    </Stack>
    {/* existing chips */}
  </>
)}
```
**Priority:** 🟢 Low

---

### SUG-BLK-009 — Show Conflict Warning When Blocks Overlap
**New scenario not in test plan** — if a spacer block is added for the same clinician, same clinic, same time as an existing block, no frontend warning is shown.  
**Suggestion:** After fetching `spacerBlocks`, check for overlapping time slots for the selected clinician on the selected date before firing the mutation.  
**Priority:** 🟢 Low (complex feature)

---

## Test Plan Gaps & Additional Scenarios

### SUG-BLK-PLAN-001 — Add TC for Tab Switch with Form Open (E13)
> **TC-MGR-BLK-02B** — Form State on Tab Switch  
> Open the "Add Spacer Block" form. Switch to "Room Blocks" tab. Switch back to "Spacer Blocks". Assert: spacer form is **closed** (post-fix SUG-BLK-006) or **still open** (current behavior, document as known issue).

### SUG-BLK-PLAN-002 — Add TC for Spacer Block: 12hr Time Format Display
Once mock data is added (SUG-BLK-001):
> **TC-MGR-BLK-05B** — Time Displayed in 12hr Format  
> Check spacer block card showing start=10:00, end=10:15. Assert: "10:00 AM – 10:15 AM" (not "10:00 – 10:15").  
> `fmt12('10:00')` should return "10:00 AM". `fmt12('13:30')` should return "1:30 PM".

### SUG-BLK-PLAN-003 — Add TC for Weekly Recurrence (no Date or End Date)
Add:
> **TC-MGR-BLK-09B** — Weekly Recurrence Fields
> Set Recurrence=Weekly. Assert: no Date field, no day chips, "End Date (optional)" is shown.

### SUG-BLK-PLAN-004 — Add TC for fmt12 Helper Edge Cases
| Input | Expected Output |
|-------|----------------|
| `'00:00'` | `12:00 AM` (midnight) |
| `'12:00'` | `12:00 PM` (noon) |
| `'23:59'` | `11:59 PM` |
| `''` or `null` | `''` (no crash) |

Source: `fmt12 = t => { if (!t) return ''; ... }` — handles empty correctly.

### SUG-BLK-PLAN-005 — Add TC for Separate Error/Success State Between Tabs
> Set `formError` via failing a create on Spacer tab. Switch to Room Blocks tab. Switch back. Assert: error alert is still visible (global `formError` state) or reset (depends on desired UX). Currently the error alert (line 280) shows above all content regardless of active tab.

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-BLK-001 | Add mock data for offline testing | 🧪 Test Infra | 🟡 Medium | Low |
| SUG-BLK-002 | Frontend time validation (end≤start) | 🐛 Validation | 🟡 Medium | 4 lines |
| SUG-BLK-003 | Frontend End Date past validation | 🐛 Validation | 🟡 Medium | 3 lines |
| SUG-BLK-004 | Validate custom recurrence needs ≥1 day | 🐛 Validation | 🟡 Medium | 3 lines |
| SUG-BLK-005 | Max length + char counter for Reason | ✨ UX | 🟢 Low | Low |
| SUG-BLK-006 | Close forms on tab switch | ✨ UX | 🟢 Low | 3 lines |
| SUG-BLK-007 | Empty state CTA buttons | ✨ UX | 🟢 Low | Low |
| SUG-BLK-008 | Select All / Clear All for day chips | ✨ UX | 🟢 Low | Low |
| SUG-BLK-009 | Block overlap conflict warning | 🚀 Feature | 🟢 Low | High |
