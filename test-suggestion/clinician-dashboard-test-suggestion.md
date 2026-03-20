# Clinician Dashboard — Test Suggestions (Updated 2026-03-19 Session 2)

**Derived from:** [clinician-dashboard-test-results.md](../test-result/clinician-dashboard-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Dashboard.jsx`  
**Date:** 2026-03-17 | **Updated:** 2026-03-19 Session 2

> **Session 2 completed all 10 items (6 bugs + 4 suggestions). Zero remaining pending items.**

---

## 🔴 High Priority — Functional Gaps

### SUG-CLDASH-001 — Wire "Add Block" Button ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `const [blockDrawerOpen, setBlockDrawerOpen] = useState(false)`
- Button `onClick={() => setBlockDrawerOpen(true)}`
- Full Drawer (anchor="right", 360px wide) with:
  - StartTime / EndTime time pickers (HTML `type="time"`)
  - Reason optional textarea
  - Cancel + Save Block buttons
  - Save disabled until both time fields filled
  - `handleSaveBlock()`: closes drawer + resets form (production: would fire mutation)
- Drawer PaperProps flex-column layout with sticky footer buttons

---

### SUG-CLDASH-002 — Wire Timeline Appointment Block Click ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `const [selectedAppt, setSelectedAppt] = useState(null)`
- `onClick={() => setSelectedAppt(appt)}` on each timeline block card
- Full Appointment Detail Drawer:
  - Patient name + Gravatar 56px avatar
  - Start time + duration + product name
  - Status chip (colour-coded via `getStatusColor()`)
  - Type chip (📹 Video or 🏥 In-Person)
  - "View Notes" → `navigate('/patients/{id}/notes')`
  - "Join Video Call" button (video type only) → `navigate('/video-consultation/{id}')`
  - "Close" text button

---

### SUG-CLDASH-003 — Wire "View Notes" Button in Upcoming Next ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `onClick={() => navigate('/patients/${nextAppt.patient.id}/notes')}`
- Applied to both the "View Notes" in Upcoming Next panel AND in the appointment detail drawer

---

### SUG-CLDASH-004 — Mock Appointment Data for Offline Testing ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `MOCK_APPOINTMENTS` (5 items: completed, 3×scheduled, cancelled; includes video and in-person types)
- `MOCK_LUNCH` (1 lunch break 12:30–13:30)
- `MOCK_SPACERS` (1 spacer block 08:00–08:30 "Morning admin")
- `const isMock = !data && !!error`
- `allAppointments = data?.getAppointments || (isMock ? MOCK_APPOINTMENTS : [])`
- Enables: TC-05, 08, 09, 10, 11, 12, 14 — all now PASS (were all SKIPPED)

---

## 🟡 Medium Priority — Validation & UX Gaps

### SUG-CLDASH-005 — Fix "Dr. Doctor" Fallback Name ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- Clinician fallback: `{ name: null, clinicianType: user?.clinician?.clinician_type?.name || 'Clinician', clinic: {...} }`
- `displayName = clinician.name ? 'Dr. '+clinician.name : user?.clinician?.full_name || user?.name || 'Dr. —'`
- In mock mode, shows "Dr. Sarah Mitchell" from useAuth. Only "Dr. —" if truly no info.

---

### SUG-CLDASH-006 — Guard Against Invalid startTime Format ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
```js
const getTopAndHeight = (startTime, durationOrEndTime) => {
  if (!startTime || !startTime.includes(':')) return { top: 0, height: 36 };
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { top: 0, height: 36 };
  // ... rest unchanged
};
```
- Safe fallback: `{ top: 0, height: 36 }` — renders at grid top with minimum height
- Also guards endTime string: checks `includes(':')` before parsing

---

### SUG-CLDASH-007 — Overlap Detection for Same-Time Blocks ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `assignOverlapColumns(appts)` function: sorts by startTime, greedily assigns columns
- Each appt gets `_col` (0-indexed) and `_totalCols`
- Overlap: `left = calc(64px + (col/totalCols)*100%)`, `width = calc((1/totalCols)*100% - 76px)`
- Single-appt columns keep original `left: 64, right: 12` for backwards compat

---

## 🟢 Low Priority — UX Improvements

### SUG-CLDASH-008 — Add Current Time Indicator + Auto-Scroll ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `showNowLine = nowTop >= 0 && nowTop <= TIMELINE_HEIGHT`
- Red `<Box height=2 bgcolor='error.main'>` + `<Box width=8 height=8 borderRadius='50%'>` dot on left
- `useRef(timelineRef)` + `useEffect`: `timelineRef.current.scrollTop = Math.max(0, nowTop - 60)` on mount
- Auto-scroll positions current time 60px from top of visible area

---

### SUG-CLDASH-009 — Show Offline/Stale Data Indicator ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `{isMock && <Alert severity="warning">⚠ Offline — showing demo data. Changes will not be saved until reconnected.</Alert>}`
- Shown below banner, above KPI cards
- Consistent with Availability module's offline banner pattern

---

### SUG-CLDASH-010 — Show "Last Updated" Timestamp ✅ DONE
**Status:** ✅ DONE (2026-03-19)  
**Fix Applied:**
- `const [lastRefresh, setLastRefresh] = useState(dayjs())`
- Updated in 60s interval: `setLastRefresh(dayjs())`
- Shown in header banner: `"Updated {dayjs().diff(lastRefresh, 'minute')} min ago"` (white 0.65rem opacity 0.5)

---

## New Suggestions — Discovered During Session 2

### SUG-CLDASH-011 — "Mark as Complete" action in Appointment Drawer
**Observation:** The appointment detail drawer (BUG-002 fix) shows status info but clinicians can't quickly mark an appointment as complete. A "Mark Complete" button would streamline workflow.  
**Priority:** 🟡 Medium | **Effort:** Medium (requires mutation) | **Status:** ⏳ PENDING (backend)

---

### SUG-CLDASH-012 — Queue Patient Click → Appointment Preview
**Observation:** Queue patient list items are not clickable. Clicking a queue patient should open the same appointment detail drawer.  
**Priority:** 🟡 Medium | **Effort:** Small (reuse selected drawer) | **Status:** ⏳ PENDING

---

### SUG-CLDASH-013 — Block Drawer: Save to Spacer API
**Observation:** The Add Block drawer form saves locally in mock mode but needs a mutation (`createSpacerBlock`) to persist.  
**Priority:** 🟡 Medium | **Effort:** Medium (backend endpoint + mutation) | **Status:** ⏳ PENDING (backend)

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CLDASH-001 | Wire Add Block → drawer with form | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-002 | Wire timeline block click → detail drawer | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-003 | Wire "View Notes" onClick | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-004 | Mock appointment data for offline | 🧪 Test Infra | 🔴 High | ✅ DONE |
| SUG-CLDASH-005 | Fix "Dr. Doctor" fallback name | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-006 | Guard invalid startTime format | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-007 | Overlap detection for same-time blocks | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-008 | Current time line + auto-scroll | ✨ UX Polish | 🟢 Low | ✅ DONE |
| SUG-CLDASH-009 | Offline data indicator alert | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLDASH-010 | "Last updated" timestamp | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLDASH-011 | "Mark Complete" in detail drawer | ✨ UX | 🟡 Medium | ⏳ PENDING (backend) |
| SUG-CLDASH-012 | Queue patient click → appointment preview | ✨ UX | 🟡 Medium | ⏳ PENDING |
| SUG-CLDASH-013 | Block form → createSpacerBlock mutation | 🔗 Integration | 🟡 Medium | ⏳ PENDING (backend) |
