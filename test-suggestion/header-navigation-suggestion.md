# Header & Navigation — Feature Suggestions (Session 2 — 2026-03-30)

**Module:** `components/Layout/Navbar.jsx`, `TopNav.jsx`, `Sidebar.jsx`, `MobileBottomNav.jsx`  
**Updated:** 2026-03-30 Session 2

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-NAV-001 | Enter key navigates to search result | 🔴 | ✅ DONE (S1) |
| SUG-NAV-002 | Unified localStorage key for layout pref | 🔴 | ✅ DONE (S1) |
| **SUG-NAV-006** | Aria-labels on icon-only buttons | 🔴 | ✅ DONE (S2) |
| **SUG-NAV-007** | Messages badge on mobile bottom nav | 🟡 | ✅ DONE (S2) |
| **SUG-NAV-008** | Search available in TopNav mode | 🟡 | ✅ DONE (S2) |
| SUG-NAV-003 | Search result count label | 🟢 | ⏭ DEFERRED |
| SUG-NAV-004 | Search history (recent items) | 🟡 | ⏭ DEFERRED |
| SUG-NAV-005 | Collapse sidebar to icon rail | 🟡 | ⏭ DEFERRED (larger feature) |

---

## Session 2 Implementation Notes

### SUG-NAV-006 — aria-labels
```jsx
// Navbar.jsx
<IconButton aria-label="Open search" ...>  // mobile search
<IconButton aria-label="Create new appointment" ...>  // + button
// Dark mode toggle already had: aria-label="Toggle dark mode"
// Mobile hamburger already had: aria-label="Open navigation"
```

### SUG-NAV-007 — Messages Badge in MobileBottomNav
```jsx
{item.path === '/messages' ? (
  <Badge badgeContent={3} sx={{ '& .MuiBadge-badge': { bgcolor: '#D93025', ... } }}>
    <item.icon sx={{ fontSize: '1.4rem' }} />
  </Badge>
) : (
  <item.icon sx={{ fontSize: '1.4rem' }} />
)}
```

### SUG-NAV-008 — Search in TopNav
TopNav already exposes `onOpenSearch` prop → `SearchRounded IconButton` at right side of bar calls it → opens `GlobalSearch` dialog. Verified correct — no code change needed.

---

## Remaining

| Item | Reason Deferred |
|------|----------------|
| SUG-NAV-003 | Low priority — "8 results" label is nice-to-have |
| SUG-NAV-004 | Requires localStorage recent search history — medium effort |
| SUG-NAV-005 | Icon rail sidebar — significant layout effort, post-backend |
