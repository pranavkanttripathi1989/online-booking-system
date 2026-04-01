# Notifications — Test Suggestions & Implementation Status

**Module:** Notifications (NotificationPanel + NotificationBell)
**Created:** 2026-03-31 (Session QA)

---

## Session QA Fixes (COMPLETED)

### BUG-NOTIF-001 — aria-labels on NotificationPanel buttons
```
Status: COMPLETED
Notes: Added aria-label to all 4 interactive buttons:
  - close button: "Close notifications panel"
  - mark-all button: "Mark all notifications as read"
  - dismiss per-item: "Dismiss notification"
  - mark-read per-item: "Mark as read: {title}"
Files: NotificationPanel.jsx
```

### BUG-NOTIF-002 — "View All Notifications" button non-functional
```
Status: COMPLETED
Notes: Added onClick to navigate to /notifications and close popover.
       Added aria-label="View all notifications".
Files: NotificationBell.jsx
```

### BUG-NOTIF-003 — No ErrorBoundary on NotificationPanel
```
Status: COMPLETED
Notes: NotificationPanelWithBoundary default export wraps inner NotificationPanel in <ErrorBoundary>.
Files: NotificationPanel.jsx
```

---

## Pending Suggestions

### SUG-NOTIF-001 — Persist notifications across sessions
```
Status: PENDING
Notes: Both components use local useState with INITIAL_NOTIFS — resets on every page load/refresh.
       Should sync with MockStore or backend to persist read/dismiss state.
Priority: HIGH
```

### SUG-NOTIF-002 — Sync unread count between NotificationBell and NotificationPanel
```
Status: PENDING
Notes: NotificationBell and NotificationPanel maintain SEPARATE notification state arrays.
       Marking read in the popover does not update the full-panel (and vice versa).
       Should share a single source of truth (MockStore or React context).
Priority: HIGH
```

### SUG-NOTIF-003 — NotificationPanel: "Notification Settings" should navigate to settings
```
Status: PENDING
Notes: Footer button calls onClose only. Should navigate to /settings?tab=notifications.
Priority: LOW
```

### SUG-NOTIF-004 — Add "clear all" / "dismiss all" button to panel
```
Status: PENDING
Notes: Individual dismiss available but no bulk-clear. A "Clear all" button in the footer
       would improve UX for users with many notifications.
Priority: LOW
```

### SUG-NOTIF-005 — Mobile drag-to-dismiss for NotificationPanel bottom sheet
```
Status: PENDING
Notes: The drag handle bar renders but is cosmetic. MUI Drawer does not natively support
       swipe-to-dismiss on bottom anchor. Could use onTouchStart/onTouchEnd with transform.
Priority: LOW
```

### SUG-NOTIF-006 — Add animation keyframe for unread dot (pulse effect)
```
Status: PENDING
Notes: The blue unread dot is static. A subtle CSS pulse animation (scale 1→1.2→1) would
       draw attention to new notifications in a non-intrusive way.
Priority: LOW
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| BUG-NOTIF-001 | aria-labels on panel buttons | ✅ COMPLETED |
| BUG-NOTIF-002 | View All Notifications onClick | ✅ COMPLETED |
| BUG-NOTIF-003 | ErrorBoundary on panel | ✅ COMPLETED |
| SUG-NOTIF-001 | Persist notifications across sessions | ⏳ PENDING |
| SUG-NOTIF-002 | Sync state between Bell and Panel | ⏳ PENDING |
| SUG-NOTIF-003 | Notification Settings navigation | ⏳ PENDING |
| SUG-NOTIF-004 | Clear all button | ⏳ PENDING |
| SUG-NOTIF-005 | Mobile swipe-to-dismiss | ⏳ PENDING |
| SUG-NOTIF-006 | Unread dot pulse animation | ⏳ PENDING |
