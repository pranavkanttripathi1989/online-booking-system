# Calendar — Test Results (Post-Fix Re-test)

**Feature:** Calendar  
**Test Plan:** [calendar-test-plan.md](../test-plan/calendar-test-plan.md)  
**First Executed:** 2026-03-16 · **Re-tested After Fixes:** 2026-03-19  
**Tester:** Antigravity AI (Browser Agent)  
**Environment:** `http://localhost:3002` (Vite dev server, mock data mode, backend offline)  
**Total Cases:** 20 | **Executed:** 20 | **Passed:** 20 ✅ | **Partial:** 0 ⚠️ | **Failed:** 0 ❌ | **Skipped:** 0 ⏭

---

## Summary

| Status | Original (2026-03-16) | Post-Fix (2026-03-19) |
|--------|-----------------------|-----------------------|
| ✅ PASS | 13 | **20** |
| ⚠️ PARTIAL | 1 (Mobile view switcher) | **0** |
| ❌ FAIL | 1 (Status filter broken) | **0** |
| ⏭ SKIPPED | 1 (Type filter missing) | **0** |

> **Overall Result: ✅ ALL 20 TEST CASES EXECUTED — 0 failures, 0 skipped, 0 partial. All 4 bugs fixed.**

---

## Bugs Fixed in Session 2

| Bug ID | Description | Fix | Status |
|--------|------------|-----|--------|
| BUG-CAL-001 | Status filter not applied to FullCalendar events | Added `filteredEvents` useMemo — filters by status, type, clinician, clinic; passes filtered list to `<CalendarView>` and `<RoomView>` | ✅ FIXED |
| BUG-CAL-002 | Calendar event ID mismatch → wrong patient on detail page | `generateMockCalendarData()` now uses real MockStore IDs (`appt-1`, `appt-2`, …) as primary events; extra visual density events use `gen-{n}` prefix | ✅ FIXED |
| BUG-CAL-003 | Mobile view switcher hidden — no fallback | Added `<Select>` with all 5 view options (Month/Week/Day/List/Room) for `xs` screens; ToggleButtonGroup remains for `sm+` | ✅ FIXED |
| BUG-CAL-004 | Missing "Type" filter (In-Person/Video/Home Visit) | Added `filterType` state and `PillSelect` with `VideocamRoundedIcon`; `filteredEvents` useMemo filters on `extendedProps.apptType` | ✅ FIXED |

---

## Suggestions Implemented in Session 2

| ID | Description | Status |
|----|------------|--------|
| SUG-CAL-007 | Status legend strip below filter bar (5 colored dot + label pairs) | ✅ DONE |
| SUG-CAL-009 | Clinician initials badge on event pills in Week view | ✅ DONE |
| SUG-CAL-010 | Mobile FAB for New Booking (fixed bottom-right, `xs` only) | ✅ DONE |
| SUG-CAL-006 | Click empty date cell → navigate to `/appointments/new?date=...` | ✅ DONE (dateClick was already handled; verified working) |

---

## Test Case Results

### TC-CAL-001 — Default view is Month
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Calendar renders in Month view on load. "March 2026" shown in header. 7-column grid, today (19) highlighted with teal circle. Status legend strip visible below filter bar: `●Confirmed ●Pending ●Cancelled ●Completed ●No Show`. |
| **Notes** | Status count chips (73 Confirmed · 17 Pending · 3 Cancelled) visible in header right. |

---

### TC-CAL-002 — Switch to Week view
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked "Week" ToggleButton. Calendar switched to week view "Mar 15–21, 2026". Clinician initials badge (small white circle) visible on event pills. |
| **Notes** | SUG-CAL-009 clinician initials badge confirmed working. |

---

### TC-CAL-003 — Switch to Day view
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Day view loads with hour slots. Appointment blocks show patient name + service + clinician name. |

---

### TC-CAL-004 — Switch to Room view
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Room columns visible: Room 1A, 1B, 2A, 2B, Room 3, Exam Suite. Appointments grouped under rooms. |

---

### TC-CAL-005 — Navigate to previous month
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked `<` arrow. Calendar transitioned March → February 2026. Day cells re-rendered for February. |

---

### TC-CAL-006 — Navigate to next month
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked `>` arrow. Calendar advanced to March 2026. |

---

### TC-CAL-007 — Today button snaps to current date
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Navigated to February, clicked "Today" — calendar returned to March 2026 with today (19) highlighted. |

---

### TC-CAL-008 — Filter by clinician
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Selected "Dr. Priya Sharma" from clinician filter. Calendar updated to show only her appointments. "Clear" chip appeared. Clearing restored full appointment list. |

---

### TC-CAL-009 — Filter by status — Confirmed/Pending (BUG-CAL-001 FIX)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (previously ❌ FAIL) |
| **Input** | Opened Status filter → selected "Pending" |
| **Expected** | Only orange/yellow pending events shown. Confirmed (green) events disappear. |
| **Actual Result** | Calendar shows **only orange pending events** across all days. All green (confirmed) events are hidden. Count shows 19 Pending only. "Clear" chip appears with red styling. |
| **Root Cause Fixed** | `filteredEvents` useMemo now correctly computes the filtered event list based on `filterStatus` and passes it to `<CalendarView events={filteredEvents} />` instead of raw `events`. |

---

### TC-CAL-010 — Filter by appointment type (BUG-CAL-004 FIX)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (previously ⏭ SKIPPED — feature missing) |
| **Input** | Opened "All Types" filter → selected "Video" |
| **Expected** | Type filter UI present; selecting "Video" shows only video/telehealth appointments. |
| **Actual Result** | "All Types" pill filter with `VideocamRoundedIcon` visible in filter row. Selected "Video" — calendar updated to show only events with `apptType: 'video'` (Telehealth Check-up service). |
| **Notes** | TYPE_OPTIONS: `['', 'in_person', 'video', 'home_visit']`. Filter integrates with existing filteredEvents useMemo. |

---

### TC-CAL-011 — Clear filters shows all appointments
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Applied Status=Pending filter. Clicked "Clear" red chip. All appointments restored. Status filter shows "All Statuses". |

---

### TC-CAL-012 — Click event opens detail popover
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked appointment block on March 5. Popover appeared with patient "Robert Clark · Dr. Carlos Vega · Home Physio · 9:00–10:00 AM · Room 1B · Confirmed chip". Glassmorphism card with teal accent bar, "View Full Details" and "Edit" buttons. |

---

### TC-CAL-013 — Popover "View Details" navigates to correct detail page (BUG-CAL-002 FIX)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (previously ⚠️ PARTIAL) |
| **Input** | Clicked appointment block → "Click to view full details" |
| **Expected** | Navigate to `/appointments/{id}`. Patient on detail matches patient in popover. |
| **Actual Result** | Popover showed "Robert Clark". Clicked "View Full Details". Navigated to `/appointments/appt-6`. Detail page rendered "Robert Clark" — same patient. ID mismatch bug resolved. |
| **Root Cause Fixed** | `generateMockCalendarData()` now first maps real MockStore appointments with their own IDs (`appt-1`, `appt-2`, etc.) ensuring popover ID and detail route ID match. |

---

### TC-CAL-014 — Mock appointment links work (mock-50)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Navigated to `/appointments/mock-50`. Detail page rendered with valid patient. No 404 or blank page. MockStore fallback still in place. |

---

### TC-CAL-015 — Events display correct colors per status
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Green events = Confirmed (`#0F9D58`), Orange/Yellow = Pending (`#F9AB00`), Red = Cancelled (`#D93025`), Teal = Completed (`#006D77`). Status legend strip confirms color mapping. |

---

### TC-CAL-016 — Mobile: view switcher collapses to dropdown (BUG-CAL-003 FIX)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (previously ⚠️ PARTIAL) |
| **Input** | Browser resized to 375px width |
| **Expected** | View buttons collapse or show as a Select dropdown. Calendar still accessible. |
| **Actual Result** | At `xs` breakpoint: `<Select>` dropdown replaces `ToggleButtonGroup` (which is `display: {xs:'none', sm:'flex'}`). Mobile FAB (teal `+` button) appears at bottom-right. Users can switch views via dropdown. |
| **Root Cause Fixed** | Added `<Select display:{xs:'flex',sm:'none'}>` mirroring all 5 view options (Month/Week/Day/List/Room) in the header. |

---

## Session 2 New Test Cases

### TC-CAL-017 — Status legend strip visible below filter bar (SUG-CAL-007)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Status legend row visible: `●Confirmed (green) ●Pending (amber) ●Cancelled (red) ●Completed (teal) ●No Show (gray)`. Sized 0.72rem caption text. Only rendered on `sm+` (hidden on mobile to save space). |

---

### TC-CAL-018 — Click empty date cell navigates to new booking (SUG-CAL-006)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked empty cell on March 10. URL changed to `/appointments/new?date=2026-03-10`. Confirmed `handleSlotClick()` receives `info.dateStr` from FullCalendar `dateClick` event. |

---

### TC-CAL-019 — Type filter "Video" shows only telehealth events (BUG-CAL-004)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Selected Type = "Video" → calendar shows only Telehealth Check-up service appointments. Combining Type=Video + Status=Confirmed filters both predicates correctly (AND logic). |

---

### TC-CAL-020 — Mobile FAB for New Booking visible on xs (SUG-CAL-010)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | At 375px width, teal FAB with `+` icon fixed at bottom-right corner. Clicking navigates to `/appointments/new`. On desktop (sm+), FAB is hidden (`display:{xs:'flex',sm:'none'}`). |

---

## Visual Evidence

| Screenshot | Description |
|-----------|-------------|
| `click_feedback_1773875429330.png` | Status filter "Pending" selected — ALL non-pending events hidden. Only orange events remain (BUG-CAL-001 fixed) |
| `click_feedback_1773875466759.png` | Calendar with all 4 filters visible + "All Types" pill + status legend strip |
| `click_feedback_1773875619614.png` | Popover showing "Robert Clark · Dr. Carlos Vega" with correct appointment details (BUG-CAL-002 fixed) |
| `calendar_full_qa_verification_1773875160718.webp` | Full recording of all test execution |

---

## Observations

1. **Status filter now works correctly (BUG-CAL-001)** — `filteredEvents = useMemo()` computes filtered subset and is passed to both `<CalendarView>` and `<RoomView>`. Real-time: status count chips update immediately on filter change.  
2. **ID resolution correct (BUG-CAL-002)** — Real MockStore events (`appt-1..appt-20`) placed first in mock data array; popover → detail page patient now consistently matches.  
3. **Type filter new (BUG-CAL-004)** — Mock data now includes `apptType` field on each event. Three types: `in_person`, `video`, `home_visit`. Combinable with status + clinician filter.  
4. **Legend strip (SUG-CAL-007)** — 5 colored dots with labels. Hidden on mobile (`xs`) to preserve limited screen space.  
5. **Mobile view switcher (BUG-CAL-003)** — `<Select>` on xs correctly mirrors the ToggleButtonGroup values. Selecting "Room" from the dropdown correctly switches to the custom `RoomView`.  
6. **Mobile FAB (SUG-CAL-010)** — Fixed position at `bottom:24, right:24`. Teal gradient matches theme. Hidden on desktop.  
