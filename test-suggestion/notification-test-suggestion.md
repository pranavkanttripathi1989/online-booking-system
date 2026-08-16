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
Status: COMPLETED
Notes: Added _widgetNotifications store + getWidgetNotifications/markWidgetNotificationRead/
       markAllWidgetNotificationsRead/dismissWidgetNotification to mocks/store.js. Both
       components now read via useMockData(store => store.getWidgetNotifications()) and
       mutate via useMockMutation, so read/dismiss state survives remounts for the session
       instead of resetting from a local INITIAL_NOTIFS/INITIAL_NOTIFICATIONS array.
Files: mocks/store.js, NotificationBell.jsx, NotificationPanel.jsx
```

### SUG-NOTIF-002 — Sync unread count between NotificationBell and NotificationPanel
```
Status: COMPLETED
Notes: Both widgets now subscribe to the same MockStore-backed list (see SUG-NOTIF-001),
       so marking read/dismissing in one immediately reflects in the other via the store's
       notify()/subscribe() mechanism. NotificationBell's icon taxonomy was aligned to
       NotificationPanel's TYPE_CONFIG keys (appointment/patient/review/result/system) since
       they now render the same underlying records. Also fixed a duplicate `export default`
       in NotificationPanel.jsx (invalid JS — two default exports in one module) discovered
       while wiring this up.
Files: mocks/store.js, NotificationBell.jsx, NotificationPanel.jsx
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
| SUG-NOTIF-001 | Persist notifications across sessions | ✅ COMPLETED |
| SUG-NOTIF-002 | Sync state between Bell and Panel | ✅ COMPLETED |
| SUG-NOTIF-003 | Notification Settings navigation | ⏳ PENDING |
| SUG-NOTIF-004 | Clear all button | ⏳ PENDING |
| SUG-NOTIF-005 | Mobile swipe-to-dismiss | ⏳ PENDING |
| SUG-NOTIF-006 | Unread dot pulse animation | ⏳ PENDING |
