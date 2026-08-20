---
id: TS005
type: test-suggestion
feature: calendar
created: 2026-03-19
updated: 2026-04-02
status: in-progress
parent: unknown
related: [TP006, TR005]
---

# Calendar — Feature Suggestions (v4 — 2026-03-29)

**Derived from:** [calendar-test-results.md](../test-result/calendar-test-results.md)  
**Test Plan Source:** [calendar-test-plan.md](../test-plan/calendar-test-plan.md)  
**Date:** 2026-03-16 | **v4 Updated:** 2026-03-29  
**Tested by:** Antigravity AI

> **STATUS UPDATE (2026-03-29 v4):** 3 new improvements added (NEW-CAL-014/015/016). All 16 frontend suggestions are now complete.

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CAL-001 | Fix status filter — filteredEvents useMemo | 🐛 Bug Fix | 🔴 Critical | ✅ DONE |
| SUG-CAL-002 | Fix appointment ID mismatch on calendar→detail | 🐛 Bug Fix | 🟡 High | ✅ DONE |
| SUG-CAL-003 | Mobile view switcher Select fallback | 🐛 Bug Fix | 🟡 High | ✅ DONE |
| SUG-CAL-004 | Add Appointment Type filter (In-Person/Video/Home) | 🚀 Feature | 🟡 Medium | ✅ DONE |
| SUG-CAL-005 | Today's Schedule mini-sidebar / drawer | 🚀 Feature | 🟢 Low | ✅ DONE |
| SUG-CAL-006 | Click empty cell → pre-fill New Booking | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-007 | Status legend strip below filter bar | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-008 | Replace CircularProgress with skeleton | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-009 | Clinician initials badge on event pill (week view) | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CAL-010 | Mobile FAB for New Booking | ✨ UX | 🟡 Medium | ✅ DONE |
| NEW-CAL-011 | Escape key closes event popover | ♿ A11y | 🟡 Medium | ✅ DONE |
| NEW-CAL-012 | Appointment type icon in popover detail row | ✨ UX | 🟢 Low | ✅ DONE |
| NEW-CAL-013 | Active filter count in Clear chip `Clear (N)` | ✨ UX | 🟢 Low | ✅ DONE |
| **NEW-CAL-014 (v4)** | Keyboard shortcuts M/W/D/L/R to switch views | ⌨️ Shortcut | 🟡 Medium | ✅ DONE |
| **NEW-CAL-015 (v4)** | Jump to Date icon button with native date picker | 🚀 Feature | 🟡 Medium | ✅ DONE |
| **NEW-CAL-016 (v4)** | apptType chip in Room View appointment cards | ✨ UX | 🟢 Low | ✅ DONE |

---

## v4 Implementation Notes

### NEW-CAL-014 — Keyboard Shortcuts for View Switching
**File:** `calendar/index.jsx` — `CalendarPage`

```jsx
const SHORTCUT_MAP = { m:'dayGridMonth', w:'timeGridWeek', d:'timeGridDay', l:'listWeek', r:'resourceDay' }
const onKey = (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
    || e.target.tagName === 'SELECT' || e.target.isContentEditable) return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const view = SHORTCUT_MAP[e.key.toLowerCase()]
  if (view) handleViewChange(null, view)
}
window.addEventListener('keydown', onKey)
```
- Fires on M/W/D/L/R globally — guards prevent activation inside text inputs and filter dropdowns.
- Modifier key guard (Alt/Ctrl/Cmd) avoids conflict with browser shortcuts.
- Empty dependency array so listener is stable — uses `handleViewChange` captured at mount.

---

### NEW-CAL-015 — Jump to Date
**File:** `calendar/index.jsx` — header, `CalendarPage`

```jsx
// Icon button opens native date picker via showPicker() API
<Box onClick={() => { setJumpDateOpen(v => !v); setTimeout(() => jumpInputRef.current?.showPicker?.(), 50) }}>
  <EventAvailableRoundedIcon />
</Box>
// Visually hidden native <input type="date"> 
<input ref={jumpInputRef} type="date" style={{ opacity:0, pointerEvents:'none', width:1, height:1 }}
  onChange={(e) => {
    const target = dayjs(e.target.value)
    if (currentView !== 'resourceDay') calendarRef.current?.getApi().gotoDate(target.toDate())
    else setRoomViewDate(target)
  }}
/>
```
- Works for both FullCalendar views and the custom Room View.
- `showPicker()` used with optional chaining for graceful degradation.
- Button shows active teal state while picker open.

---

### NEW-CAL-016 — apptType Chip in Room View Cards
**File:** `calendar/index.jsx` — `RoomView` appointment card render

```jsx
{evt.extendedProps?.apptType && evt.extendedProps.apptType !== 'in_person' && (
  <Box sx={{ ...tealBackground... }}>
    {apptType === 'video' ? <VideocamRoundedIcon /> : <DirectionsCarRoundedIcon />}
    <Typography>{apptType === 'video' ? 'Video' : 'Home Visit'}</Typography>
  </Box>
)}
```
- In-Person is the default/most common type — no chip shown (avoids visual clutter).
- Only "Video" and "Home Visit" types display their chip.
- Uses already-imported icons (`VideocamRoundedIcon`, `DirectionsCarRoundedIcon`).

---

## Remaining Backend-Dependent Items

| Priority | Item | Notes |
|----------|------|-------|
| 🟡 Medium | Real-time subscription event highlighting | WebSocket infra |
| 🟡 Medium | Drag-and-drop rescheduling | Backend PATCH mutation |
| 🟢 Low | iCal / calendar export | Backend file generation |
| 🟢 Low | Print schedule view | CSS print stylesheet |
