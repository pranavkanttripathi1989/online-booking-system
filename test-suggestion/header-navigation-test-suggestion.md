# Header & Navigation — Feature Suggestions (v1.0)

**Derived from:** [header-navigation-test-results.md](../test-result/header-navigation-test-results.md)  
**Completed:** 2026-03-20

---

## Bug Fixes (Implemented)

### SUG-NAV-001 — Enter Key in Search Navigates to Selected Result → ✅ IMPLEMENTED
**Triggered by:** TC-NAV-016 (BUG-NAV-001)  
**File:** `frontend/src/components/Layout/Navbar.jsx`  
**Fix:** Added plain Enter handler to `handleInlineKey`. Computes `results` array (not just length), indexes `results[activeIdx]`, calls `handleSelect(selected)`.  
**Status:** ✅ IMPLEMENTED

---

### SUG-NAV-002 — Unified localStorage Key for Layout Preference → ✅ IMPLEMENTED
**Triggered by:** TC-NAV-021 (BUG-NAV-002)  
**File:** `frontend/src/components/Layout/Layout.jsx`  
**Fix:** `useState` initialiser reads `medibook_nav_layout` first, falls back to legacy `hs_nav_layout`, then `'left'`.  
**Status:** ✅ IMPLEMENTED

---

## UX Improvements (Deferred)

### SUG-NAV-003 — Search Result Count Label (P2)
```
Suggestion:   Show "X results" count at the bottom of search dropdown
Status:       PENDING
Priority:     Low — helpful for power users
Files:        frontend/src/components/Layout/Navbar.jsx (InlineSearchDropdown footer)
```

### SUG-NAV-004 — Search History (Recent Items) (P2)
```
Suggestion:   Show recently visited pages/patients when search is first opened
              (before any typing), instead of hardcoded quick links only.
Status:       PENDING
Priority:     Medium — improves repeat-usage UX
Files:        Navbar.jsx — add localStorage recent search list
```

### SUG-NAV-005 — Collapse Sidebar to Icon Rail (P2)
```
Suggestion:   Add a collapse trigger to the sidebar that reduces it to a 60px icon rail
              (labels hidden), expanding on hover or click.
Status:       PENDING
Priority:     Medium — saves horizontal space on smaller desktops
Files:        frontend/src/components/Layout/Sidebar.jsx + Layout.jsx
```

### SUG-NAV-006 — Add Aria Labels to Icon Buttons (P1, Accessibility)
```
Suggestion:   All icon-only buttons (dark mode toggle, new appointment, layout toggle)
              should have aria-label attributes for screen reader accessibility.
Status:       PENDING
Priority:     High — accessibility compliance
Notes:        Navbar "Add Appointment" button missing aria-label.
              Dark mode toggle missing descriptive label update when toggling.
Files:        frontend/src/components/Layout/Navbar.jsx
```

### SUG-NAV-007 — Bottom Nav Badge for Notifications (P2)
```
Suggestion:   The "Notify" item in BOTTOM_NAV shows a NotificationsIcon but has
              no badge count. Add a badge reflecting unread count.
Status:       PENDING
Priority:     Low — nice to have
Files:        frontend/src/layouts/AppShell.jsx, layouts/MobileBottomNav.jsx
```

### SUG-NAV-008 — Top Navigation Search Bar (P3)
```
Suggestion:   In Top Nav mode, the search pill/bar disappears (no search available
              except via the user clicking into the hidden area). The search pill
              should also be available in TopNav mode.
Status:       PENDING
Priority:     Medium — search is a core feature in both layout modes
Files:        frontend/src/components/Layout/TopNav.jsx + Layout.jsx
```

---

## Summary

| ID | Suggestion | Status |
|----|------------|--------|
| SUG-NAV-001 | Enter key search selection | ✅ IMPLEMENTED |
| SUG-NAV-002 | Unified localStorage key | ✅ IMPLEMENTED |
| SUG-NAV-003 | Search result count label | ⏭ DEFERRED |
| SUG-NAV-004 | Search history (recent items) | ⏭ DEFERRED |
| SUG-NAV-005 | Collapse sidebar to icon rail | ⏭ DEFERRED |
| SUG-NAV-006 | Aria labels (accessibility) | ⏭ DEFERRED |
| SUG-NAV-007 | Bottom nav notification badge | ⏭ DEFERRED |
| SUG-NAV-008 | Search in Top Nav mode | ⏭ DEFERRED |
