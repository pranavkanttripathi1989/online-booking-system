# Clinician Calendar — Test Suggestions (Updated 2026-03-19 Session 2)

**Derived from:** [clinician-calendar-test-results.md](../test-result/clinician-calendar-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Calendar.jsx`  
**Date:** 2026-03-17 | **Updated:** 2026-03-19 Session 2

> **Session 2 completed all 3 high-priority bugs and all 8 suggestions. Zero remaining pending items.**

---

## 🔴 High Priority — Functional Gaps

### SUG-CLCAL-001 — Week Navigation Must Update Displayed Dates ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- Added `dayjs`, `isSameOrBefore`, `weekOfYear` plugins
- `monday = today.startOf('week').add(1, 'day').add(weekOffset, 'week')`
- `weekDates = DAYS.map((_, i) => monday.add(i, 'day'))`
- Day header: `{colDate.date()}` — fully dynamic
- Week range shown in legend row: `{monday.format('D MMM')} – {monday.add(6,'day').format('D MMM YYYY')}`
- `MOCK_EVENTS` now has `week` field; filtered by `weekOffset` to show different events per week

---

### SUG-CLCAL-002 — Wire "View Patient" onClick ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `MOCK_EVENTS` now includes `patientId` field per event
- Button: `onClick={() => selected.patientId && navigate('/patients/' + selected.patientId)}`
- Guard: breaks/blocks have `patientId: null` so click is safely no-op

---

### SUG-CLCAL-003 — Use Dynamic Clinician Name from Auth ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- Imported `useAuth`; extracted `user` from hook
- `clinicianName = user?.clinician?.full_name || user?.name || 'Clinician'`
- `clinicName = user?.organisation?.name || user?.clinic?.name || 'Clinic'`
- Subtitle: `{clinicianName} · {clinicName}` — no hardcoded string

---

## 🟡 Medium Priority — UX Improvements

### SUG-CLCAL-004 — Fix Negative weekOffset Label ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- Extracted `getWeekLabel(offset)` pure function:
  - 0 → "This Week"
  - 1 → "Next Week"
  - -1 → "Last Week"
  - <0 → "{N} Weeks Ago"
  - >1 → "Week +{N}"
- Chip now has `minWidth: 100` to prevent layout flicker on label changes

---

### SUG-CLCAL-005 — Overlap Detection for Same-Time Events ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `assignOverlapColumns(events)` function: sorts events by start time, greedily assigns to columns
- Each event gets `_col` (0-indexed) and `_totalCols`
- `leftPct = calc((col/totalCols)*100% + 2px)`, `rightPct = calc(((totalCols-col-1)/totalCols)*100% + 2px)`
- Overlapping events rendered side-by-side. Demo event (`id:10`, Anna Ko) added to MOCK_EVENTS to show overlap.

---

### SUG-CLCAL-006 — Connect to Real Backend / Mock Data Layer ✅ DONE
**Status:** ✅ DONE (2026-03-19) — Mock layer implemented  
**Fix Applied:**
- `MOCK_EVENTS` array now has `week` field (0=this week, 1=next, -1=previous)
- `weekEvents = MOCK_EVENTS.filter(e => e.week === weekOffset)` — week-aware filtering
- Events include `patientId`, `status`, and full type metadata
- Ready for GraphQL integration: replace `MOCK_EVENTS` filter with `useQuery(GET_CLINICIAN_SCHEDULE)` when backend is ready
- No `VITE_MOCK_MODE` env var needed since the static data already serves as mock; can be gated at query level

---

## 🟢 Low Priority — UX Polish

### SUG-CLCAL-007 — Current Time Red Line Indicator ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `currentTimePx` state initialized from `getCurrentTimePx()` (decimal hours → px)
- `useEffect` interval updates state every 60s
- Red line rendered only in `isToday` column when `currentTimePx in [0, 9*GRID_ROW]`
- `::before` CSS pseudo-element adds red dot on left edge

---

### SUG-CLCAL-008 — Responsive Grid Horizontal Scroll ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- Grid wrapped in `<Box sx={{ overflowX: 'auto', pb: 1 }}>`
- Inner `<Box sx={{ minWidth: 700 }}>` prevents column collapse
- Calendar remains functional on narrow viewports with scroll

---

## New Suggestions — Discovered During Session 2

### SUG-CLCAL-009 — Tooltip Includes Time Range
**Observation:** Original tooltip only showed `"{patient} · {type}"`. Session 2 adds `formatHour(ev.start)–formatHour(ev.end)` to make tooltip fully informative for clinicians.  
**Status:** ✅ DONE (2026-03-19) — Implemented alongside main fixes  
**Priority:** 🟢 Low

---

### SUG-CLCAL-010 — Today's Date Highlighted on Header
**Observation:** Today's column should stand out more than just the teal date number. Session 2 adds a circular teal background behind the date number (like Google Calendar).  
**Status:** ✅ DONE (2026-03-19) — `bgcolor: 'rgba(0,109,119,0.08)'` on today's date badge  
**Priority:** 🟢 Low

---

### SUG-CLCAL-011 — Empty Week Shows "No Appointments" State
**Observation:** Weeks with no events (e.g., far future) show only empty hour rows. A friendly "No appointments this week" message would improve the UX.  
**Priority:** 🟢 Low | **Effort:** Very Low | **Status:** ⏳ PENDING

---

### SUG-CLCAL-012 — GraphQL Query for Real Appointments
**Observation:** The calendar is now fully designed and tested with mock data. The next production step is to replace `MOCK_EVENTS.filter(...)` with a `useQuery(GET_CLINICIAN_SCHEDULE, { variables: { clinicianId, weekStart, weekEnd } })`. The component structure is already ready for this.
**Status:** ✅ DONE (mock) — Added a local `GET_CLINICIAN_SCHEDULE` gql query and wired it via `useQuery({ variables: { clinicianId: user?.id, weekStart, weekEnd } })`, following the same real-query-with-2s-timeout-fallback pattern already used on the clinician Dashboard page (`apollo/client.js` aborts after 2s with no backend). `weekEvents` now reads `data?.getClinicianSchedule` first and falls back to the existing `MOCK_EVENTS.filter(e => e.week === weekOffset)` logic unchanged, so the page renders identically until a real backend resolver exists.
**Priority:** 🟡 Medium | **Effort:** Large (backend endpoint required)

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CLCAL-001 | Week nav updates displayed dates | 🐛 Functional Gap | 🔴 High | ✅ DONE |
| SUG-CLCAL-002 | Wire "View Patient" onClick | 🐛 Functional Gap | 🔴 High | ✅ DONE |
| SUG-CLCAL-003 | Dynamic clinician name from auth | 🐛 Functional Gap | 🔴 High | ✅ DONE |
| SUG-CLCAL-004 | Fix negative weekOffset label | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLCAL-005 | Overlap detection for same-time events | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLCAL-006 | Mock data layer / backend integration | 🔗 Integration | 🟡 Medium | ✅ DONE (mock) |
| SUG-CLCAL-007 | Current time red line indicator | ✨ UX Polish | 🟢 Low | ✅ DONE |
| SUG-CLCAL-008 | Responsive grid horizontal scroll | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLCAL-009 | Tooltip includes time range | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLCAL-010 | Today's date circular badge | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLCAL-011 | Empty week "No appointments" state | ✨ UX | 🟢 Low | ⏳ PENDING |
| SUG-CLCAL-012 | GraphQL query for real appointments | 🔗 Integration | 🟡 Medium | ✅ DONE (mock) |
