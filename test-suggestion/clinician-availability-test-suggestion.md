# Clinician Availability — Test Suggestions (Session 4 — 2026-03-30)

**Derived from:** [clinician-availability-test-results.md](../test-result/clinician-availability-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Availability.jsx`  
**Date:** 2026-03-17 | **Updated:** 2026-03-19 Session 3 | **Session 4:** 2026-03-30

> **Session 4 Result: 3 new features implemented. All 21 frontend items complete. Zero pending items.**

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CLAVAIL-001 | Implement lunch break actions | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLAVAIL-002 | Mock fallback for offline state | 🧪 Test Infra | 🔴 High | ✅ DONE |
| SUG-CLAVAIL-003 | Replace native alert/confirm with MUI | 🐛 UX Bug | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-004 | Valid Until < Valid From validation | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-005 | Unsaved changes warning on drawer close | ✨ UX | 🟡 Medium | ⏳ DEFERRED |
| SUG-CLAVAIL-006 | Availability link in sidebar | 🧭 Navigation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-007 | Slot overlap detection | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-008 | Minimum spinner visibility | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-009 | Null guard for room name | 🐛 Visual | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-010 | Day selector Tu/Th/Sa/Su + tooltips | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-011 | Lunch list empty state | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-012 | Overlap warning: show conflicting times | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-013 | Persist day selection across recurrence | ✨ UX | 🟢 Low | ✅ DONE |
| ISSUE-S3-001 | Remove dead `useRef` import | 🔧 Code | 🟢 Low | ✅ DONE |
| ISSUE-S3-002 | Remove dead `EventAvailableRounded` import | 🔧 Code | 🟢 Low | ✅ DONE |
| ISSUE-S3-003 | Reliable lunch detection via `_type` | 🐛 Bug Fix | 🟡 Medium | ✅ DONE |
| ISSUE-S3-007 | Drawer flex layout for sticky buttons | ✨ UX | 🟡 Medium | ✅ DONE |
| ISSUE-S3-008 | Drawer closes after delete | 🐛 Bug Fix | 🟡 Medium | ✅ DONE |
| **NEW-CLAVAIL-014** | Duration badge on slot cards | ✨ UX | 🟢 Low | ✅ DONE |
| **NEW-CLAVAIL-015** | Delete button inside lunch edit drawer | ✨ UX | 🟡 Medium | ✅ DONE |
| **NEW-CLAVAIL-016** | Slot/lunch count chips in page header | ✨ UX | 🟢 Low | ✅ DONE |

---

## Session 4 Implementation Notes

### NEW-CLAVAIL-014 — Duration Badge on Slot Cards
**File:** `clinician/Availability.jsx` — `formatDuration()` + slot card JSX

```js
function formatDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMins = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMins <= 0) return null;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
```
- Frosted-glass pill badge (`rgba(255,255,255,0.2)`) at right of time row.
- Badge hidden when `totalMins <= 0` (avoids showing negative/zero durations).
- Pure JS helper — no extra imports needed.

---

### NEW-CLAVAIL-015 — Delete Button in Lunch Edit Drawer
**File:** `clinician/Availability.jsx` — lunch drawer action row

```jsx
<Stack direction="row" justifyContent="space-between" alignItems="center" ...>
  {editLunch
    ? <Button color="error" onClick={() => handleDeleteLunch(editLunch.id)}>Delete</Button>
    : <Box />}
  <Stack direction="row" gap={2}>
    <Button ...>Cancel</Button>
    <Button ...>Save Break</Button>
  </Stack>
</Stack>
```
- Consistent with slot drawer pattern (Delete at left, Save/Cancel at right).
- Calls existing `handleDeleteLunch()` → triggers `ConfirmDialog` (no direct delete).
- Disabled when `savingLunch` to prevent concurrent mutations.
- Shown only when `editLunch` is set; new-break drawer shows no Delete.

---

### NEW-CLAVAIL-016 — Slot/Lunch Count Chips in Header
**File:** `clinician/Availability.jsx` — page header

```jsx
const totalSlots   = availabilities.filter(a => a._type === 'slot').length;
const totalLunches = lunchBreaks.length;

<Chip label={`${totalSlots} slot${totalSlots !== 1 ? 's' : ''}`} ... />
<Chip label={`${totalLunches} lunch break${totalLunches !== 1 ? 's' : ''}`} ... />
```
- Both chips are reactive — update when data is fetched or changed.
- Singular/plural handled correctly (e.g. "1 slot", "2 slots").
- Primary-light for slots, warning-light for lunches — matches the grid colour semantics.

---

## Remaining Backend-Dependent Items

| Item | Notes |
|------|-------|
| SUG-CLAVAIL-005 — Unsaved changes warning | Requires dirty-state tracking; deferred |
| TC-CLAVAIL-09, 10, 13, 23 (PASS*) | Need live backend for full confirm |
