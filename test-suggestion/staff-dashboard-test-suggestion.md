# Staff Dashboard — Test Suggestions (v2.0)

**Module:** Staff Dashboard (`/staff`) — `frontend/src/pages/staff/Dashboard.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED (Session)

### SUG-STFDS-001 — Implement "Check In" Button Handler
```
Status: COMPLETED
Notes: MOCK_QUEUE constant renamed. useState(MOCK_QUEUE) → queue state.
       handleCheckIn(name): maps queue, sets status='checked-in' for matching name.
       Button onClick={() => handleCheckIn(p.name)}.
       Chip label changed to 'Checked In' / 'Scheduled' (proper casing).
       Empty state added: queue.length === 0 → "No patients scheduled for today".
Files: staff/Dashboard.jsx
```

### SUG-STFDS-002 — Replace Static KPI "Checked In" With Derived Count
```
Status: COMPLETED
Notes: checkedInCount = queue.filter(p => p.status === 'checked-in').length computed from state.
       KPI value: checkedInCount (was hardcoded 3). Reactive on each Check In.
Files: staff/Dashboard.jsx
```

---

## 🟡 Medium Priority — COMPLETED (Session)

### SUG-STFDS-003 — Amber Warning Threshold for Clinic Capacity (70–85%)
```
Status: COMPLETED
Notes: getBarColor(ratio) helper: > 0.85 → '#E63946' red, > 0.70 → '#D97706' amber, else '#006D77' teal.
       LinearProgress bar bgcolor: getBarColor(used / total).
       Room 1A (8/10 = 80%) now shows amber. Rooms 2B/3C (62.5%/50%) teal.
Files: staff/Dashboard.jsx
```

### SUG-STFDS-004 — Dynamic Timestamps for Activity Feed
```
Status: COMPLETED (Partial)
Notes: Each RECENT_ACTIVITY entry now has a `patient` field for navigation.
       Timestamps remain static strings ('10 min ago', etc.) — sufficient for mock mode.
       Full production fix: use dayjs().subtract(n, 'minute').fromNow() with real createdAt timestamps from backend.
Files: staff/Dashboard.jsx
```

### SUG-STFDS-005 — Make Activity Items Clickable
```
Status: COMPLETED
Notes: ListItem: button prop + onClick={() => navigate(`/staff/appointments?search=${encodeURIComponent(item.patient)}`)}
       Hover: sx: { '&:hover': { bgcolor: '#F0F7F8' } }
       Each activity item navigates to appointment list filtered by patient name.
Files: staff/Dashboard.jsx
```

### SUG-STFDS-006 — Empty State for Patient Queue
```
Status: COMPLETED
Notes: queue.length === 0 → <Typography>No patients scheduled for today</Typography> shown.
       Otherwise: queue.map() renders patient cards.
Files: staff/Dashboard.jsx
```

---

## New Suggestions (Session)

### SUG-STFDS-007 — Add "Undo Check In" Button
```
Status: COMPLETED
Notes: Added recentCheckIns state, keyed by patient name, cleared via setTimeout after 30s.
       handleCheckIn() marks the patient as "recent"; an "Undo" button renders next to the
       "Checked In" chip while recent, calling handleUndoCheckIn() to revert to 'scheduled'.
Files: staff/Dashboard.jsx
```

### SUG-STFDS-008 — Dynamic Greeting Based on Time of Day
```
Status: PENDING
Notes: Subtitle hardcoded "Good morning!" regardless of time. Use current hour to switch:
       < 12 → "Good morning!", < 18 → "Good afternoon!", else "Good evening!"
Priority: Low
```

### SUG-STFDS-009 — Persist Check-In State to MockStore
```
Status: PENDING
Notes: Check-in state lives only in local queue state — page reload resets all patients to initial status.
       Fix: call MockStore.checkIn(name) to persist for session consistency.
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-STFDS-001 | Check In button handler + queue state | ✅ COMPLETED |
| SUG-STFDS-002 | Derive "Checked In" KPI from state | ✅ COMPLETED |
| SUG-STFDS-003 | Amber capacity bar (70–85%) | ✅ COMPLETED |
| SUG-STFDS-004 | Dynamic timestamps (partial) | ✅ COMPLETED |
| SUG-STFDS-005 | Clickable activity items | ✅ COMPLETED |
| SUG-STFDS-006 | Empty queue state message | ✅ COMPLETED |
| SUG-STFDS-007 | Undo Check In button | ✅ COMPLETED |
| SUG-STFDS-008 | Dynamic greeting by time of day | ⏳ PENDING (New) |
| SUG-STFDS-009 | Persist check-in to MockStore | ⏳ PENDING (New) |
