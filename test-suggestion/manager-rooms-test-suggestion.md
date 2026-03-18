# Manager Rooms — Test Suggestions

**Derived from:** [manager-rooms-test-results.md](../test-result/manager-rooms-test-results.md)  
**Source Files:** `frontend/src/pages/manager/rooms/` (index, create, detail, edit)  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-RM-001 — Fix Detail Page Blank on Apollo Network Error (BUG-RM-001)

**Problem:** When backend is offline, Apollo throws a network error (not a `null` data response). The mock fallback `room ?? { name: 'Room 1A', ... }` only works when `data.room = null`. When the query throws, `data` is `undefined` and `room` is `undefined`. The skeleton guard `if (loading && !room)` is skipped because `loading = false` after error. Result: **blank page**.

**Fix 1 — Handle Apollo error explicitly:**
```jsx
// In detail.jsx, destructure error from useQuery:
const { data, loading, error } = useQuery(ROOM_DETAIL_QUERY, {
  variables: { id },
  fetchPolicy: 'cache-and-network',
})

const room = data?.room

// Fix the guard to also handle error state:
if (loading && !room) return (
  <Box>
    <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
  </Box>
)

// Mock fallback covers both: data.room = null AND error state (room = undefined)
const r = room ?? {
  id,
  name: 'Room 1A',
  capacity: 4,
  is_active: true,
  clinic: { id: '1', name: 'London Central Clinic' },
}
```

**Fix 2 — Show error alert + use mock data:**
```jsx
{error && (
  <Alert severity="warning" sx={{ mb: 2 }}>
    Could not load room data — showing preview.
  </Alert>
)}
```

**Priority:** 🔴 High | **Effort:** 3 lines | **Prevents:** Blank white page UX failure

---

### SUG-RM-002 — Fix Edit Page Navigation Trap: Keep Header in Skeleton State (BUG-RM-002)

**Problem:** When edit page is in skeleton state (`fetching || !form`), the entire render is replaced — including the header with Cancel and Back buttons. The user is stuck with no way to navigate back except using the browser's back button.

**Current code (line 36 `edit.jsx`):**
```jsx
if (fetching || !form) return <Box><Skeleton ... /><Skeleton ... /></Box>
```

**Fix — Always render the header, only skeleton the body:**
```jsx
if (fetching || !form) return (
  <Box>
    {/* Always show header so user can navigate away */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: '#F1F3F4' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Typography variant="h5" fontWeight={800}>Loading Room…</Typography>
      <Box flex={1} />
      <Button variant="outlined" onClick={() => navigate('/manager/rooms')}
        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
        Cancel
      </Button>
    </Box>
    <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
  </Box>
)
```

Also add a timeout fallback (same as product suggestion):
```js
useEffect(() => {
  const timer = setTimeout(() => {
    if (!form) {
      enqueueSnackbar('Could not load room data.', { variant: 'warning' })
      navigate('/manager/rooms')
    }
  }, 8000)
  return () => clearTimeout(timer)
}, [form])
```

**Priority:** 🔴 High | **Effort:** 10 lines | **Prevents:** User navigation trap

---

## 🟡 Medium Priority — Data & Feature Gaps

### SUG-RM-003 — Add Mock Data to Index Page for Offline Testing

**Problem:** Index page shows empty state when backend offline. 14 of 33 TCs cannot be tested without live backend or mock data.

**Fix — Add mock fallback in `index.jsx` `fetchFn`:**
```js
const fetchFn = useCallback(async ({ search, limit, offset }) => {
  try {
    const { data } = await client.query({ ... })
    return data?.roomsPaginated
  } catch {
    // Fallback mock response
    const mockRooms = [
      { id: 'r1', room_number: '101', room_type: 'consultation', roomTypeName: 'Consultation Room',
        clinician_type: 'gp', clinicianTypeName: 'GP', is_active: true,
        clinic: { id: 'c1', name: 'London Central Clinic' } },
      { id: 'r2', room_number: '102', room_type: 'treatment', roomTypeName: 'Treatment Room',
        clinician_type: 'specialist', clinicianTypeName: 'Specialist', is_active: false,
        clinic: { id: 'c1', name: 'London Central Clinic' } },
      { id: 'r3', room_number: '201', room_type: 'consultation', roomTypeName: 'Consultation Room',
        clinician_type: 'gp', clinicianTypeName: 'GP', is_active: true,
        clinic: { id: 'c2', name: 'Manchester Clinic' } },
    ]
    const filtered = search
      ? mockRooms.filter(r => r.room_number.includes(search))
      : mockRooms
    return {
      data: filtered.slice(offset, offset + limit),
      pageInfo: { total: filtered.length, limit, offset, hasNextPage: offset + limit < filtered.length, hasPreviousPage: offset > 0 }
    }
  }
}, [client])
```

Also add mock metadata:
```js
useEffect(() => {
  client.query({ query: GET_METADATA }).then(({ data }) => {
    setMetadata({ clinics: data?.clinics || MOCK_CLINICS, ... })
  }).catch(() => {
    setMetadata(MOCK_METADATA)
  })
}, [])

const MOCK_METADATA = {
  clinics: [{ id: 'c1', name: 'London Central Clinic' }, { id: 'c2', name: 'Manchester Clinic' }],
  roomTypes: [{ id: 'rt1', name: 'Consultation Room' }, { id: 'rt2', name: 'Treatment Room' }],
  clinicianTypes: [{ id: 'ct1', name: 'GP' }, { id: 'ct2', name: 'Specialist' }],
}
```

**Priority:** 🟡 Medium | **Enables:** 14 skipped TCs

---

### SUG-RM-004 — Add Frontend Validation: Negative Capacity (E5)

**Problem:** Capacity field (`type="number"`) has no `min` attribute — accepts `-1`, `-100`, etc.

**Fix in both `create.jsx` and `edit.jsx`:**
```jsx
<TextField
  label="Capacity"
  type="number"
  inputProps={{ min: 1, max: 100 }}
  ...
/>
```

**Priority:** 🟡 Medium | **Effort:** 2 lines each file

---

### SUG-RM-005 — Create Page: Navigate to List (Not Edit) After Success

**Current behavior (TC-MGR-RM-21):** After creating a room, the user is navigated to `/manager/rooms/:newId/edit` (create.jsx line 25). This is intentional in the source — so the user can add more details immediately.

**Consideration:** Some users may not want to be taken to edit after creation. Suggest adding a brief snackbar delay with a "View List" action:
```jsx
enqueueSnackbar('Room created', {
  variant: 'success',
  action: (key) => (
    <Button size="small" onClick={() => { closeSnackbar(key); navigate('/manager/rooms') }}>
      View List
    </Button>
  )
})
```
**Priority:** 🟡 Medium (UX decision — document current behavior in test plan)

---

### SUG-RM-006 — Room Number Truncation (E11)

**Problem:** Room number displayed as `<Typography variant="h6">Room {room_number}</Typography>` with no `noWrap` or max-width. A 50+ char room number would overflow the card.

**Fix:**
```jsx
<Typography variant="h6" fontWeight={700} noWrap sx={{ maxWidth: '90%' }}>
  Room {room.room_number}
</Typography>
```

**Priority:** 🟡 Medium (cosmetic but visible with edge case data)

---

## 🟢 Low Priority — UX Improvements

### SUG-RM-007 — Search: Show "Clear" Button When Text Present

When "Room 101" is typed but no results found, a "Clear search" or ✕ icon would help users quickly reset:
```jsx
<TextField
  value={searchTerm}
  InputProps={{
    endAdornment: searchTerm ? (
      <IconButton size="small" onClick={() => handleSearch('')}>
        <ClearIcon fontSize="small" />
      </IconButton>
    ) : null
  }}
/>
```
**Priority:** 🟢 Low

---

### SUG-RM-008 — Room Cards: Show Clinic Badge More Prominently

Currently clinic name is shown as tiny `<Typography variant="caption">`. With multiple clinics, it would be more scannable as an outlined Chip.

**Priority:** 🟢 Low

---

### SUG-RM-009 — Add Type Badge Coloring by Room Type

Rooms of different types (Consultation, Treatment, etc.) could be visually distinguished by color-coding the room type chip, matching the clinic's design language.

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Scenarios

### SUG-RM-PLAN-001 — Add TC: Room Card Hover Shadow

> **TC-MGR-RM-02B** — Room card hover elevation  
> With mock data: hover over a room card. Assert: `boxShadow: 4` applied (source line 261: `'&:hover': { boxShadow: 4 }`). Transition 0.2s.

### SUG-RM-PLAN-002 — Add TC: ConfirmDialog Text Verification

> **TC-MGR-RM-14B** — Confirm dialog content  
> Click delete. Assert: dialog title = **"Delete Room"**, message = **"Delete this room permanently? This cannot be undone."** (source lines 297–298).

### SUG-RM-PLAN-003 — Add TC: Edit Then Cancel (Form Resets)

> **TC-MGR-RM-13B** — Edit form cancel resets to new state  
> Click edit on room card → form shows "Edit Room" title. Click Cancel. Click "Add Room" again. Assert: title is back to "New Room" and all fields are empty (no stale edit values).

### SUG-RM-PLAN-004 — Add TC: Search Fires on Each Keypress

> **TC-MGR-RM-03B** — Search debounce behavior  
> Type "Room 10" character by character. Assert: `handleSearch` called per change (no debounce visible). Each keypress triggers `loadData(0)` with the updated search term.

### SUG-RM-PLAN-005 — Add TC: Create → Redirect to Edit After Success

> **TC-MGR-RM-21B** — After room creation, page redirects to edit page  
> Create a room with live backend. Assert: URL changes to `/manager/rooms/:newId/edit`. Assert: form pre-filled with the newly created room's data. (This is deliberately different from other modules that return to `/manager/rooms`.)

### SUG-RM-PLAN-006 — Add TC: Detail Skeleton (Cache Miss)

> **TC-MGR-RM-24B** — Skeleton on initial load  
> Navigate to a room detail page with empty Apollo cache. Assert: two skeleton rectangles visible during fetch. Source: `fetchPolicy: 'cache-and-network'` — shows skeleton only if `loading && !room` (cache miss).

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-RM-001 | Fix detail page blank on network error | 🐛 Bug Fix | 🔴 High | 3 lines |
| SUG-RM-002 | Fix edit skeleton navigation trap | 🐛 Bug Fix | 🔴 High | 10 lines |
| SUG-RM-003 | Add mock data to index for offline testing | 🧪 Test Infra | 🟡 Medium | Medium |
| SUG-RM-004 | Negative capacity validation (min=1) | 🛡 Validation | 🟡 Medium | 2 lines |
| SUG-RM-005 | Post-create navigation UX (snackbar action) | ✨ UX | 🟡 Medium | Low |
| SUG-RM-006 | Room number truncation on cards | 🐛 Visual Bug | 🟡 Medium | 2 lines |
| SUG-RM-007 | Clear button in search bar | ✨ UX | 🟢 Low | Low |
| SUG-RM-008 | Clinic badge on room cards | ✨ UX | 🟢 Low | Low |
| SUG-RM-009 | Room type color coding | ✨ UX | 🟢 Low | Low |

### Quick Wins (< 5 min):
- **SUG-RM-001**: 3-line fix + `error` destructure — prevents blank detail page (**critical UX**)
- **SUG-RM-004**: Add `inputProps={{ min: 1 }}` to both create and edit Capacity fields
- **SUG-RM-006**: Add `noWrap` to room number Typography
