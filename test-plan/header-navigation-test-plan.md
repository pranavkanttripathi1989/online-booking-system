# Header, Navigation & Global Search — Test Plan

**Feature area:** `/src/layouts/AppShell.jsx`, `/src/components/Layout/`  
**Components:** AppBar, Sidebar DrawerContent, TopNavBar, SearchDropdown, NotificationBell  
**Routes affected:** All authenticated routes

---

## 1. Sidebar Navigation (Left Mode)

### TC-NAV-001 — Sidebar renders with correct items per role
**Prompt:**  
> Log in as Admin. Assert: sidebar shows Dashboard, Appointments, Calendar, Patients, Clinicians, Messages (badge 3), Staff, Finances, Reviews, Analytics, Test Results, Settings, Manager section, Admin section.

**Expected:** All admin nav items visible. Role-filtered: Patient gets fewer items.

---

### TC-NAV-002 — Active nav item highlighted in teal
**Prompt:**  
> Navigate to `/appointments`. Assert: "Appointments" nav item has teal gradient background. All other items have no highlight.

**Expected:** `isActive('/appointments')` true → teal gradient pill + white text.

---

### TC-NAV-003 — Manager expand/collapse section
**Prompt:**  
> Log in as Manager. Click "Manager" nav item in the sidebar (expandable).  
> Assert: sub-items expand: Clinics, Availability, Blocks, Rooms, Products, Services, Billing.  
> Click again — sub-items collapse.

**Expected:** `expandedManager` toggle. `<Collapse>` MUI component animates in/out.

---

### TC-NAV-004 — Admin expand/collapse section
**Prompt:**  
> Log in as Admin. Click "Admin" nav item.  
> Assert: sub-items expand: Users & RBAC, Organizations, Communications, Policies, Roles, Clinician Types, Room Types, Languages, Email Templates.

**Expected:** `expandedAdmin` toggle. Admin sub-items visible.

---

### TC-NAV-005 — Messages badge shows unread count
**Prompt:**  
> Log in as any user. Observe "Messages" item in the sidebar.  
> Assert: a red badge "3" visible on the Messages icon.

**Expected:** `badge: 3` in NAV_CONFIG renders as red pill on Messages item.

---

### TC-NAV-006 — Emergency 911 button at sidebar bottom
**Prompt:**  
> Scroll to the bottom of the sidebar.  
> Assert: red-tinted "⚠ Emergency — 911" link visible. Clicking it opens `tel:911`.

**Expected:** Emergency link styled in red/dark. `href="tel:911"` set.

---

### TC-NAV-007 — User card shows name, role chip, online indicator
**Prompt:**  
> Log in as Admin. Observe the user card below the sidebar header.  
> Assert: "Admin User" name shown, "Admin" chip visible, green dot (online indicator) on avatar.

**Expected:** Avatar with initials, role chip with correct color/label, green online dot.

---

## 2. AppBar Header (Left Mode)

### TC-NAV-008 — Teal progress bar at top of header
**Prompt:**  
> On any page. Assert: a slim 3px gradient bar visible at the very top of the white AppBar (colors: teal → teal-light → green).

**Expected:** The gradient accent bar renders. Height 3px. `position: absolute, top: 0`.

---

### TC-NAV-009 — Header shadow appears on scroll
**Prompt:**  
> On a page with scrollable content (e.g., `/analytics`). Scroll down 20px.  
> Assert: header gains a subtle `box-shadow`. Scrolling back to top removes shadow.

**Expected:** `scrolled` state computed via `window.scrollY > 4`. Shadow applied conditionally.

---

### TC-NAV-010 — Page title shows correct label
**Prompt:**  
> Navigate to `/appointments`. Assert: header shows "Appointments".  
> Navigate to `/staff`. Assert: header shows "Staff Management" or "Staff".

**Expected:** `navItems.find(n => location.pathname.startsWith(n.path))?.label` drives title.

---

### TC-NAV-011 — New Appointment quick button
**Prompt:**  
> In the header, click the teal "+" icon button (AddRoundedIcon).  
> Assert: navigated to `/appointments/new`.

**Expected:** `navigate('/appointments/new')` fires. Quick action button works.

---

## 3. Collapsible Inline Search

### TC-NAV-012 — Search pill expands on click
**Prompt:**  
> In the header, click the "Search…" pill with the ⌘K hint.  
> Assert: pill expands into a full search input (full-width with teal focus border). Cursor is in the input field.

**Expected:** `inlineOpen = true`. InputBase auto-focused. Border becomes `2px solid ${TEAL}`.

---

### TC-NAV-013 — Empty search shows Quick Links suggestions
**Prompt:**  
> Open the search bar (click pill or ⌘K). Do not type anything.  
> Assert: dropdown appears showing "QUICK LINKS" section with Calendar, Analytics, Settings.

**Expected:** `results = SEARCH_DATA.filter(d => d.type === 'page').slice(0, 6)` when query is empty.

---

### TC-NAV-014 — Type "alice" shows patient suggestions
**Prompt:**  
> Open search. Type "alice".  
> Assert: dropdown shows "PATIENTS" group with "Alice Thompson". Avatar with green patient icon.

**Expected:** Filter on `label.toLowerCase().includes('alice')`. Grouped result.

---

### TC-NAV-015 — Type "dr" shows clinician suggestions
**Prompt:**  
> Type "dr" in the search.  
> Assert: "CLINICIANS" group appears with Dr. Sarah Mitchell, Dr. James Okafor.

**Expected:** Clinician results shown in purple avatar group.

---

### TC-NAV-016 — Keyboard navigation (arrow keys)
**Prompt:**  
> Open search. Press ↓ arrow twice.  
> Assert: second result row is highlighted (blue/teal background). Press ↵ (Enter).  
> Assert: navigated to that result's path. Search closes.

**Expected:** `searchActiveIdx` increments/decrements. Enter fires `handleSearchSelect`.

---

### TC-NAV-017 — ESC closes search
**Prompt:**  
> Open search bar. Press Escape key.  
> Assert: search bar collapses back to the "Search…" pill. Dropdown disappears. Query cleared.

**Expected:** `setInlineOpen(false)` + `setSearchQuery('')` on Escape keypress.

---

### TC-NAV-018 — ⌘K shortcut opens search
**Prompt:**  
> On any page, press Cmd+K (Mac) or Ctrl+K (Windows).  
> Assert: search bar opens. Cursor in input field.

**Expected:** Global `keydown` listener for `(e.metaKey || e.ctrlKey) && e.key === 'k'`.

---

### TC-NAV-019 — Click outside closes search
**Prompt:**  
> Open search. Click anywhere outside the search box (on the page content).  
> Assert: search closes. Pill collapses.

**Expected:** `mousedown` event listener on `document` fires. `inlineOpen = false`.

---

## 4. Navigation Layout Toggle

### TC-NAV-020 — Toggle from Left Sidebar to Top Nav
**Prompt:**  
> In sidebar mode, click the ViewStream icon (horizontal bars) near the page title.  
> Assert: layout switches to a dark horizontal top navigation bar with all nav items as horizontal pill buttons.

**Expected:** `navLayout` changes to `'top'`. `TopNavBar` renders. Sidebar disappears. Content expands to full width.

---

### TC-NAV-021 — Top nav layout persisted across page refresh
**Prompt:**  
> Switch to top nav layout. Refresh the browser (F5).  
> Assert: top nav layout still active. Sidebar does not reappear.

**Expected:** `localStorage.getItem('hs_nav_layout') === 'top'` on rehydration.

---

### TC-NAV-022 — Switch back to sidebar from Top Nav
**Prompt:**  
> In top nav mode, click the ViewSidebar icon in the top-right of the top nav bar.  
> Assert: layout switches back to left sidebar + white AppBar.

**Expected:** `navLayout` changes to `'left'`. LocalStorage updates. Sidebar re-renders.

---

### TC-NAV-023 — Top Nav "More" dropdown for overflow items
**Prompt:**  
> In top nav mode, observe the navigation items.  
> Assert: first 6 items shown as buttons. Remaining items appear in a "More ▾" dropdown menu.

**Expected:** `mainItems = navItems.slice(0, 6)`. `moreItems = navItems.slice(6)`. Dropdown open on click.

---

### TC-NAV-024 — Layout toggle also accessible from user menu
**Prompt:**  
> Click the avatar menu top-right. Find "Switch to Top Nav" / "Switch to Sidebar" menu item.  
> Assert: clicking it switches the layout.

**Expected:** `toggleLayout` called from user menu `MenuItem`. Same effect as header icon.

---

## 5. User Menu

### TC-NAV-025 — User menu opens on avatar click
**Prompt:**  
> Click the avatar icon top-right.  
> Assert: menu appears with: user name, role chip, "My Profile", "Settings", "Switch to Top Nav / Sidebar", "Sign Out".

**Expected:** MUI `<Menu>` renders with all menu items.

---

### TC-NAV-026 — Sign Out clears session
**Prompt:**  
> Click avatar → Sign Out.  
> Assert: redirected to `/login`. Sidebar disappears. Navigating to `/dashboard` redirects to `/login`.

**Expected:** `signOut()` calls `logout()` → `navigate('/login')`.

---

## 6. Dark Mode Toggle

### TC-NAV-027 — Dark mode toggle icon
**Prompt:**  
> In the header, click the moon icon (DarkMode).  
> Assert: icon changes to sun (LightMode). `darkMode = true`.  
> Click again — moon icon returns.

**Expected:** `setDarkMode` toggles. Icon switches between DarkModeRoundedIcon and LightModeRoundedIcon.

---

## 7. Mobile Navigation

### TC-NAV-028 — Mobile hamburger opens drawer
**Prompt:**  
> Resize to 375px (mobile). Navigate to any page.  
> Assert: sidebar is hidden. Hamburger (MenuIcon) button visible in top-left of AppBar.  
> Click hamburger — sidebar slides open as a temporary drawer.

**Expected:** `isMobile` true → `Drawer variant="temporary"`. Hamburger visible. Drawer opens.

---

### TC-NAV-029 — Bottom navigation bar visible on mobile
**Prompt:**  
> On mobile (375px), observe the bottom of the screen.  
> Assert: bottom navigation bar with icons: Dashboard, Calendar, Appointments, Notifications, Menu. Active item highlighted in teal.

**Expected:** `<BottomNavigation>` renders. Active index matches current route.
