# Manager Rooms — Feature Suggestions (Final)

**Source:** `rooms/index.jsx`, `create.jsx`, `detail.jsx`, `edit.jsx`
**Session:** Session 1 — QA + Fix + Suggestion Cycle Complete

---

## Bug Fixes

### BUG-RM-001 — Detail Page Blank on Apollo Error
**Status:** COMPLETED
`detail.jsx` — Added `error` to `useQuery` destructure. Mock fallback (`r = room ?? { name:'Room 1A', ... }`) now triggers both when `data.room = null` (unknown ID, live backend) and when Apollo throws a network error (`data = undefined`, backend offline).

### BUG-RM-002 — Edit Page Navigation Trap in Skeleton State
**Status:** COMPLETED
`edit.jsx` — Skeleton early-return now wraps in `<Box className="page-enter">` with a full header containing `ArrowBackRoundedIcon` wired to `/manager/rooms` and `aria-label="Back to rooms"`. Users can always navigate away.

---

## Gap Fixes

### GAP-RM-001 — No Mock Data on Index Page
**Status:** COMPLETED
`index.jsx` — `MOCK_ROOMS` (3 rooms: rm-1/101, rm-2/102, rm-3/201) and `MOCK_METADATA` (2 clinics, 2 room types, 2 clinician types) added. `fetchFn` wrapped in try/catch — catch returns mock pageInfo. Metadata query chain has `.catch()` that loads `MOCK_METADATA`.

### GAP-RM-002 — Negative Capacity Accepted (E5)
**Status:** COMPLETED
`create.jsx` + `edit.jsx` — `inputProps={{ min: 0 }}` added to Capacity `TextField`. Browser enforces non-negative at input level.

---

## Suggestions

### SUG-RM-001 — Wire to Live Backend
```
Suggestion: Remove mock fallbacks in production; connect rooms pages to real GraphQL endpoints
Status: PENDING
Notes: MOCK_ROOMS and fetchFn try/catch should remain as offline fallback; live data takes priority
```

### SUG-RM-002 — Room Card: Truncate Long Room Numbers
```
Suggestion: Add noWrap + textOverflow:'ellipsis' to room number Typography on index cards
Status: COMPLETED
Notes: index.jsx line 306 — Typography now has noWrap + sx={{ overflow:'hidden', textOverflow:'ellipsis' }}
```

### SUG-RM-003 — aria-labels on Room Card Edit/Delete Buttons
```
Suggestion: Add aria-label to Edit/Delete icon buttons on index room cards
Status: COMPLETED
Notes: index.jsx lines 297+300 — aria-label="Edit room {room_number}" and "Delete room {room_number}"
```

### SUG-RM-004 — Detail Page Back Button aria-label
```
Suggestion: Add aria-label="Back to rooms" to IconButton in detail.jsx
Status: COMPLETED
Notes: detail.jsx line 54 — aria-label="Back to rooms" added
```

### SUG-RM-005 — ErrorBoundary Wrappers on Rooms Pages
```
Suggestion: Wrap ManagerRooms and RoomDetailPage with ErrorBoundary for crash resilience
Status: COMPLETED
Notes: index.jsx — ManagerRoomsWithBoundary export; detail.jsx — RoomDetailPageWithBoundary export. edit.jsx and create.jsx use notistack for error display (sufficient coverage).
```

---

## Summary Table

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| BUG-RM-001 | Detail blank on Apollo error | High | ✅ COMPLETED |
| BUG-RM-002 | Edit nav trap in skeleton | Medium | ✅ COMPLETED |
| GAP-RM-001 | No mock data on index | High | ✅ COMPLETED |
| GAP-RM-002 | Negative capacity accepted | Medium | ✅ COMPLETED |
| SUG-RM-001 | Wire to live backend | High | ⏳ PENDING |
| SUG-RM-002 | Truncate long room numbers | Low | ✅ COMPLETED |
| SUG-RM-003 | aria-labels on card buttons | Low | ✅ COMPLETED |
| SUG-RM-004 | Detail back button aria-label | Low | ✅ COMPLETED |
| SUG-RM-005 | ErrorBoundary wrappers | Medium | ✅ COMPLETED |
