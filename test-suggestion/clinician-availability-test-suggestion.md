# Clinician Availability — Test Suggestions (Updated 2026-03-19 Session 3)

**Derived from:** [clinician-availability-test-results.md](../test-result/clinician-availability-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Availability.jsx`  
**Date:** 2026-03-17 | **Updated:** 2026-03-19 Session 3

> **Session 3 Result: 11/11 items resolved (8 issues + 3 pending suggestions). Zero pending items. All PASS.**

---

## 🔴 High Priority — Bug Fixes

### SUG-CLAVAIL-001 — Implement Lunch Break Actions ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- Added `lunchDrawerOpen`, `editLunch`, `lunchForm`, `savingLunch`, `deleteLunchTarget` state
- Added `SAVE_LUNCH_BREAK` and `DELETE_LUNCH_BREAK` GraphQL mutations
- `handleOpenLunchDrawer(lb?)`, `handleCloseLunchDrawer()`, `handleSaveLunch()`, `handleDeleteLunch(id)`, `confirmDeleteLunch()` handlers implemented
- Second `<Drawer>` component with time pickers for lunch break form
- All 3 buttons wired: Add Break → new drawer, Edit → pre-filled drawer, Delete → ConfirmDialog

---

### SUG-CLAVAIL-002 — Add Mock Fallback for Offline State ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- Removed hard `if (avError) return ...` early-return
- `availabilities` and `lunchBreaks` useMemos fall back to `MOCK_AVAILABILITY` / `MOCK_LUNCHES` on `avError`
- Yellow warning `<Alert severity="warning">` with Retry button shown above grid
- Mock data also added to `frontend/src/mocks/store.js` with full CRUD functions

---

### SUG-CLAVAIL-003 — Replace Native alert/confirm with MUI ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- `useSnackbar` from notistack: error + success snackbars in all handlers
- `window.confirm()` replaced with two `<ConfirmDialog>` instances (slot + lunch break)

---

## 🟡 Medium Priority — Validation & Safety Gaps

### SUG-CLAVAIL-004 — Add Validation: Valid Until Before Valid From ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- `isDateRangeInvalid` useMemo + inline `<Alert severity="error">` + Save button disabled

---

### SUG-CLAVAIL-005 — Add Unsaved Changes Warning on Drawer Close ⏳ DEFERRED
**Status:** ⏳ DEFERRED — Low risk, medium effort  
**Notes:** Drawer closes silently on backdrop click. No dirty-state tracking implemented. Deferred to avoid complexity.

---

### SUG-CLAVAIL-006 — Add Availability Link to Clinician Sidebar ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2 + Session 3 root cause fix)  
**Fix Applied:**
- Added to `Sidebar.jsx` NAV_SECTIONS: `{ label: 'My Availability', path: '/clinician/availability', icon: <AccessTimeRounded />, roles: ['clinician'] }`
- **Session 3:** Root cause found — clinician layout uses `AppShell.jsx`, not `Sidebar.jsx`. Added same item to `NAV_CONFIG` in `AppShell.jsx` with `roles: ['clinician']`. Now correctly visible in browser.

---

### SUG-CLAVAIL-007 — Slot Conflict/Overlap Detection ✅ DONE
**Status:** ✅ DONE — Enhanced in Session 3 (see SUG-CLAVAIL-012)  
**Fix Applied:**
- `hasOverlap()` → renamed to `findOverlap()` in Session 3 (returns conflicting slot for detail display)
- Non-blocking `<Alert severity="warning">` in drawer
- Save button NOT disabled

---

## 🟢 Low Priority — UX Improvements

### SUG-CLAVAIL-008 — Minimum Spinner Visibility ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- `minSpinnerDone` state + 300ms `setTimeout` + guard in render

---

### SUG-CLAVAIL-009 — Room Dropdown: Null Guard ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- `{r.name || 'Unnamed Room'} (Room {r.roomNumber})` in option labels and grid tooltip

---

### SUG-CLAVAIL-010 — Day Selector Disambiguation ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 2)  
**Fix Applied:**
- `DAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su']` + `DAY_FULL` for tooltips
- Each `<ToggleButton>` wrapped in `<Tooltip title={DAY_FULL[i]} placement="top">`

---

### SUG-CLAVAIL-011 — Lunch Break Drawer: Empty State ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 3)  
**Fix Applied:**
- `Alarm` icon (greyed, `fontSize: 36`) + "No lunch breaks configured" heading + subtitle text
- "Add First Break" outlined button wired to `handleOpenLunchDrawer()`
- Styled empty state box with dashed border + light grey background

---

### SUG-CLAVAIL-012 — Slot Overlap Warning: Show Conflicting Slot Times ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 3)  
**Fix Applied:**
- `hasOverlap()` renamed to `findOverlap()` — returns first conflicting slot object (or null)
- `conflictingSlot` useMemo replaces `slotOverlap` boolean
- Alert text: `"Overlaps with existing slot {conflictingSlot.startTime}–{conflictingSlot.endTime} ({dayName}). You can still save."`

---

### SUG-CLAVAIL-013 — Persist Day Selection Across Recurrence Change ✅ DONE
**Status:** ✅ DONE (2026-03-19 Session 3)  
**Fix Applied:**
- Extracted `handleRecurrenceChange(newType)` which only calls `setFormData(prev => ({ ...prev, recurrence_type: newType }))`
- `day_of_week` is never touched when recurrence type changes
- ToggleButtonGroup correctly shows previously-selected day when switching back to 'weekly'

---

## Session 3 — Code Quality Fixes (Not Originally in Suggestions)

### ISSUE-S3-001 — Dead `useRef` import ✅ FIXED
**Status:** ✅ FIXED (2026-03-19 Session 3)  
**Notes:** Removed from React import. No runtime impact but reduces misleading code.

---

### ISSUE-S3-002 — Dead `EventAvailableRounded` icon import ✅ FIXED
**Status:** ✅ FIXED (2026-03-19 Session 3)  
**Notes:** Removed from `@mui/icons-material` import. Slightly reduces bundle.

---

### ISSUE-S3-003 — Fragile Lunch Detection (`id.includes('lunch')`) ✅ FIXED
**Status:** ✅ FIXED (2026-03-19 Session 3)  
**Notes:** All items now tagged with `_type: 'slot'` or `_type: 'lunch'`. Grid checks `item._type === 'lunch'`. Helper functions `tagSlots()` and `tagLunches()` applied to API responses.

---

### ISSUE-S3-007 — Drawer Flex Layout (Sticky Action Buttons) ✅ FIXED
**Status:** ✅ FIXED (2026-03-19 Session 3)  
**Notes:** Both Drawers now have `display: 'flex', flexDirection: 'column'` in PaperProps. Form body in `<Box sx={{ flex: 1, overflowY: 'auto' }}>`. Action row gets `flexShrink: 0`.

---

### ISSUE-S3-008 — Drawer Stays Open After Delete ✅ FIXED
**Status:** ✅ FIXED (2026-03-19 Session 3)  
**Notes:** Both `confirmDeleteSlot()` and `confirmDeleteLunch()` now check whether the deleted item was the one being edited and close the drawer accordingly. `refetch()` is now properly `await`ed before closing.

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CLAVAIL-001 | Implement lunch break actions | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLAVAIL-002 | Mock fallback for offline state | 🧪 Test Infra | 🔴 High | ✅ DONE |
| SUG-CLAVAIL-003 | Replace native alert/confirm with MUI | 🐛 UX Bug | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-004 | Valid Until < Valid From validation | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-005 | Unsaved changes warning | ✨ UX | 🟡 Medium | ⏳ DEFERRED |
| SUG-CLAVAIL-006 | Availability link in sidebar | 🧭 Navigation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-007 | Slot overlap detection | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLAVAIL-008 | Minimum spinner visibility | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-009 | Null guard for room name | 🐛 Visual | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-010 | Day selector Tu/Th/Sa/Su + tooltips | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-011 | Lunch list empty state | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-012 | Overlap warning: show conflicting times | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLAVAIL-013 | Persist day selection across recurrence | ✨ UX | 🟢 Low | ✅ DONE |
| ISSUE-S3-001 | Remove dead `useRef` import | 🔧 Code quality | 🟢 Low | ✅ DONE |
| ISSUE-S3-002 | Remove dead `EventAvailableRounded` import | 🔧 Code quality | 🟢 Low | ✅ DONE |
| ISSUE-S3-003 | Reliable lunch detection via `_type` | 🐛 Bug Fix | 🟡 Medium | ✅ DONE |
| ISSUE-S3-007 | Drawer flex layout for sticky buttons | ✨ UX | 🟡 Medium | ✅ DONE |
| ISSUE-S3-008 | Drawer closes after delete | 🐛 Bug Fix | 🟡 Medium | ✅ DONE |
