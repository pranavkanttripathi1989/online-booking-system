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
| **SUG-NAV-004** | Search history (recent items) | 🟡 | ✅ DONE (S3) |
| **SUG-NAV-005** | Collapse sidebar to icon rail | 🟡 | ✅ DONE (S3) |

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

## Session 3 Implementation Notes

### SUG-NAV-004 — Search History (Recent Items)
**Implementation:** `Navbar.jsx` inline search now persists selections to `localStorage` (`medibook_recent_search`, capped at 5, most-recent-first). When the search box is opened with an empty query, the dropdown shows a "Recent" group built from that list instead of the hardcoded quick-links; falls back to the quick-links group when there's no history yet. Keyboard navigation (`handleInlineKey`) and the dropdown now share one `computeResults()` helper so both stay in sync.

### SUG-NAV-005 — Collapse Sidebar to Icon Rail
**Implementation:** Added a `collapsed` state to `Layout.jsx` (persisted to `localStorage` as `medibook_sidebar_collapsed`), passed into `Sidebar.jsx`/`Navbar.jsx`. Desktop permanent drawer now toggles between `DRAWER_WIDTH` (256px) and a new `COLLAPSED_DRAWER_WIDTH` (76px) icon rail via a chevron toggle next to the logo; labels, section headers, and footer text hide when collapsed, with `Tooltip`s on each icon showing the label. Expansion is click-based (not hover) for reliability. The mobile temporary drawer is unaffected — it always renders expanded.

---

## Remaining

| Item | Reason Deferred |
|------|----------------|
| SUG-NAV-003 | Low priority — "8 results" label is nice-to-have |
