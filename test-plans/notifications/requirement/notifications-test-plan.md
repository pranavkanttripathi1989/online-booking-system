---
id: TP025
type: test-plan
feature: notifications
created: 2026-04-02
updated: 2026-04-02
status: approved
parent: unknown
related: [TR024, TS024]
---

# Notifications — Test Plan

**Module:** Notifications (NotificationPanel + NotificationBell)
**Components:** `NotificationPanel.jsx` · `NotificationBell.jsx`
**Updated:** 2026-03-31 (Session QA)
**Environment:** `http://localhost:3001` — mock data inline, backend offline
**Prereq:** Log in as any role. Notifications icon visible in AppBar.

---

## Feature Overview

The notification system has two UI surfaces:
- **NotificationBell** (`AppBar`) — compact popover with 5 recent notifications and "Mark all read" + "View All Notifications" buttons
- **NotificationPanel** — full slide-in Drawer (right on desktop, bottom sheet on mobile) with 7 notifications, All/Unread filter tabs, per-item dismiss, mark-read, and navigate-to-action

Both run fully offline using inline `INITIAL_NOTIFS` / `INITIAL_NOTIFICATIONS` mock arrays.

---

## Test Cases — NotificationBell (Popover)

### TC-NOTIF-001 — Bell Badge Shows Unread Count
**Steps:** Observe notification bell icon in AppBar.
**Expected:** Badge shows `3` (3 unread in mock). Bell icon switches to filled `NotificationsIcon` when unread > 0. Badge capped at 9.

---

### TC-NOTIF-002 — Click Bell Opens Popover
**Steps:** Click the notification bell icon.
**Expected:** Popover opens beneath bell (right-aligned). Shows header with "Notifications" + unread chip. Shows list of 5 notification items. Footer with "View All Notifications" button.

---

### TC-NOTIF-003 — Notification List Items Render Correctly
**Steps:** Open bell popover. Inspect notification items.
**Expected:** Each item shows: type icon (booking/confirmed/cancelled/payment/video), title (bold if unread), body, timestamp. Unread items highlighted with dot indicator.

---

### TC-NOTIF-004 — Click Notification Item Marks as Read
**Steps:** Open popover. Click any unread notification.
**Expected:** That notification's bold styling normalises. Blue dot disappears. Unread badge count decrements.

---

### TC-NOTIF-005 — Mark All Read Button
**Steps:** Open popover. Click "Mark all read" in header.
**Expected:** All notifications lose bold + dot. Badge count reaches 0. Bell icon switches to `NotificationsNoneIcon`.

---

### TC-NOTIF-006 — View All Notifications Button
**Steps:** Open popover. Click "View All Notifications".
**Expected:** Popover closes. Browser navigates to `/notifications` route.

---

### TC-NOTIF-007 — Bell aria-label Updates with Count
**Steps:** Inspect bell button DOM.
**Expected:** `aria-label` reads "{n} unread notifications". After marking all read: "0 unread notifications".

---

## Test Cases — NotificationPanel (Drawer)

### TC-NOTIF-008 — Panel Opens as Side Drawer (Desktop)
**Steps:** Open NotificationPanel at ≥600px viewport width.
**Expected:** Drawer slides from the right. Width 380px. Full-height. Close button (×) in header.

---

### TC-NOTIF-009 — Panel Opens as Bottom Sheet (Mobile)
**Steps:** Open NotificationPanel at <600px viewport width.
**Expected:** Drawer slides from the bottom. Max height 78vh. Rounded top corners. Drag handle bar visible.

---

### TC-NOTIF-010 — Panel Shows 7 Notifications
**Steps:** Open panel. Check list.
**Expected:** 7 items rendered: 3 unread (blue left-border + blue bg), 4 read (white bg). Type icons: EventNote (appointment), PersonAdd (patient), Star (review), Science (result), Announcement (system).

---

### TC-NOTIF-011 — Filter: "Unread" Tab
**Steps:** Open panel. Click "Unread (3)" chip.
**Expected:** List filters to 3 unread items only. "Unread (3)" chip becomes blue/selected.

---

### TC-NOTIF-012 — Filter: "All" Tab Restores Full List
**Steps:** After filtering to Unread, click "All" chip.
**Expected:** All 7 items visible. "All" chip becomes blue/selected.

---

### TC-NOTIF-013 — Click Notification Marks Read + Navigates
**Steps:** Click an unread notification (e.g. "New Appointment Booked").
**Expected:** `markRead(id)` called — blue border/bg disappears. If `action` is set, navigates to it (`/appointments`) and panel closes.

---

### TC-NOTIF-014 — "Mark as read" Button on Unread Item
**Steps:** Hover over an unread item. Click inline "✓ Mark as read" button.
**Expected:** Click event stops propagation (no navigation). Item loses unread styling. `markAllRead`/`markRead` called. Unread count decrements.

---

### TC-NOTIF-015 — Dismiss Button Removes Item
**Steps:** Hover over any notification to reveal the (×) dismiss button. Click it.
**Expected:** Click stops propagation. Notification removed from list. Total count ("7 total notifications") decrements.

---

### TC-NOTIF-016 — Mark All Read in Panel Header
**Steps:** Click the double-tick icon (mark all read) in panel header (only visible when unread > 0).
**Expected:** All items lose unread styling. Unread chip in header disappears. Mark-all button hidden.

---

### TC-NOTIF-017 — Empty State When All Unread Dismissed/Read (Unread Tab)
**Steps:** Switch to "Unread" tab, then mark all items as read.
**Expected:** Empty state shows: `DoneAllRoundedIcon` + "All caught up!" + "No unread notifications".

---

### TC-NOTIF-018 — Notification Settings Button
**Steps:** Click "Notification Settings" button in panel footer.
**Expected:** Panel closes (`onClose` called). (Settings navigation deferred — currently calls `onClose` only.)

---

## Accessibility TCs

### TC-NOTIF-019 — aria-labels on NotificationPanel Buttons
**Steps:** Inspect DOM for close, mark-all, dismiss, mark-read buttons.
**Expected:**
- Close: `aria-label="Close notifications panel"`
- Mark all: `aria-label="Mark all notifications as read"`
- Dismiss per item: `aria-label="Dismiss: {title}"`
- Mark read per item: `aria-label="Mark as read: {title}"`

---

### TC-NOTIF-020 — ErrorBoundary on NotificationPanel
**Steps:** Verify default export is `NotificationPanelWithBoundary`.
**Expected:** `<ErrorBoundary><NotificationPanel /></ErrorBoundary>` wraps component.

---

## Edge Cases

| # | Case | Expected |
|---|------|----------|
| E1 | All notifications dismissed | List empty; empty state NOT shown (empty state only for Unread tab) |
| E2 | System notification (no action) | Clicking marks read but does NOT navigate |
| E3 | Notification with `action: null` | `if (n.action) { navigate(...) }` guard; no crash |
| E4 | All unread read in Unread tab | "All caught up!" empty state |
| E5 | Badge > 9 unread | Badge renders "9+" due to `max={9}` prop |
| E6 | Bell aria-label at 0 unread | "0 unread notifications" — accessible |

---

## Total: 20 Test Cases + 6 Edge Cases
