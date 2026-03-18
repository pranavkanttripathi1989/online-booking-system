# Notifications Page — Test Suggestions

**Derived from:** [notifications-test-results.md](../test-result/notifications-test-results.md)  
**Source File:** `frontend/src/pages/notifications/index.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bugs & Critical Gaps

### SUG-NOTIF-001 — Data Inconsistency: Topbar Badge vs Page Query (OBS-1)

**Problem:** The topbar bell icon shows a red badge "**3**" indicating 3 notifications, but the `/notifications` page query returns empty for both "Unread" and "All" filters. This means users clicking the bell icon to view notifications will see an empty inbox — highly confusing.

**Root Cause:** The topbar likely uses a separate, possibly mock-wired query or a different `GET_NOTIFICATIONS` query variant. The full-page query uses backend data which returns `[]` when offline or with a different filter/variable.

**Fix — Unify data source:**
1. Check if the topbar notification popover uses mock data while the page uses live Apollo
2. Ensure both components use the same `GET_NOTIFICATIONS` query and variables
3. Or add mock fallback to the page query:
```js
const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Appointment Reminder', message: 'Emma Wilson at 09:00', type: 'appointment', priority: 'normal', is_read: false, created_at: new Date().toISOString() },
  { id: '2', title: 'Payment Received', message: '$150 received from Omar Hassan', type: 'payment', priority: 'normal', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', title: 'System Alert', message: 'Backup completed', type: 'alert', priority: 'high', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];
const notifications = data?.notifications || (error ? MOCK_NOTIFICATIONS : []);
```

**Priority:** 🔴 High

---

### SUG-NOTIF-002 — Add Confirmation Before Delete (OBS-4)

**Problem:** Clicking the red delete `<IconButton>` immediately fires `DELETE_NOTIF` mutation with no confirmation. There is no undo mechanism. Accidental taps delete notifications permanently.

**Fix:**
```jsx
const [deleteTarget, setDeleteTarget] = useState(null);

// Replace onClick:
onClick={() => setDeleteTarget(notif.id)}

// Add confirmation dialog:
<Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
  <DialogTitle>Delete Notification?</DialogTitle>
  <DialogActions>
    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
    <Button color="error" onClick={() => { run(deleteNotif, { id: deleteTarget }); setDeleteTarget(null); }}>Delete</Button>
  </DialogActions>
</Dialog>
```

**Priority:** 🔴 High | **Effort:** ~20 lines

---

### SUG-NOTIF-003 — Add `skip: !user?.id` Auth Guard (OBS-2)

**Problem:** `useQuery(GET_NOTIFICATIONS, { variables: { filter } })` — no `skip` condition. Query fires for unauthenticated users, causing unnecessary 401 errors.

**Fix:**
```js
const { user } = useAuth();
const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
  variables: { filter },
  fetchPolicy: 'cache-and-network',
  pollInterval: 30000,
  skip: !user?.id,  // Add this line
})
```

**Priority:** 🔴 High | **Effort:** 1 line

---

## 🟡 Medium Priority — UX & Validation

### SUG-NOTIF-004 — Prevent Race Condition on Concurrent Mutations (E6)

**Problem:** `run()` has no loading/pending guard. If a user rapidly clicks "Delete" on different notifications while a previous delete is still in-flight, multiple simultaneous `DELETE_NOTIF` mutations fire. If the backend processes them in different order, data inconsistency may occur.

**Fix — Track in-flight mutations:**
```js
const [pendingId, setPendingId] = useState(null);

const run = async (fn, vars) => {
  if (pendingId) return; // prevent concurrent actions
  setPendingId(vars.id || 'all');
  setActionError(null);
  try { await fn({ variables: vars }); refetch(); }
  catch (err) { setActionError(err.message); }
  finally { setPendingId(null); }
};

// Disable action buttons while pending:
<IconButton disabled={!!pendingId} onClick={() => run(deleteNotif, { id: notif.id })}>
```

**Priority:** 🟡 Medium | **Effort:** ~10 lines

---

### SUG-NOTIF-005 — Add Loading State to "Mark All Read" Button

**Problem:** When "Mark All Read" is clicked, the button gives no feedback during the mutation. If the mutation takes >500ms, users may click it again.

**Fix:**
```js
const [markingAll, setMarkingAll] = useState(false);

const handleMarkAll = async () => {
  setMarkingAll(true);
  await run(markAllRead, {});
  setMarkingAll(false);
};

<Button disabled={markingAll} startIcon={markingAll ? <CircularProgress size={14} /> : <CheckIcon />}>
  {markingAll ? 'Marking...' : 'Mark All Read'}
</Button>
```

**Priority:** 🟡 Medium | **Effort:** ~8 lines

---

### SUG-NOTIF-006 — Add Notification Count to Filter Chips

**Problem:** The Unread/All toggle gives no indication of counts. Users don't know if they have 1 or 100 unread notifications.

**Fix:**
```jsx
// Get unread count from current data:
const unreadCount = notifications.filter(n => !n.is_read).length;

<Button sx={{ ... }}>
  {f === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : 'All'}
</Button>
```

**Priority:** 🟡 Medium

---

### SUG-NOTIF-007 — Show Relative Time for iconColor Priority vs Type

**Problem:** `iconColor()` (line 39) checks `priority === 'high'` first, then `type`. This means a high-priority appointment notification gets a **red** icon (high priority wins), not blue (appointment). The test plan documents this but it may surprise users.

**Example:**
```js
// A high-priority appointment:
iconColor('high', 'appointment') → { bg: '#FEE2E2', color: '#DC2626' }  // RED
// Not blue (appointment)! Priority wins.
```

**Fix — Consider a merged styling or document this explicitly:**
Either document this is intentional, or allow type to influence icon even for high-priority (e.g., keep icon type but change icon background to red).

**Priority:** 🟡 Medium

---

## 🟢 Low Priority — UX Polish & Improvements

### SUG-NOTIF-008 — Persist Poll Even When Tab is Hidden

**Problem:** Apollo's `pollInterval` fires even when the tab is hidden (background), wasting network requests. On mobile, this drains battery.

**Fix — Pause polling when hidden:**
```js
useEffect(() => {
  const handleVisibility = () => {
    if (document.hidden) stopPolling(); else startPolling(30000);
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [stopPolling, startPolling]);
```

**Priority:** 🟢 Low

---

### SUG-NOTIF-009 — Add "Mark as Unread" Option

**Problem:** Once a notification is marked read, there's no way to mark it unread again. Some users may want to "flag" a notification for follow-up.

**Fix:** Add a secondary action button (or tooltip) on read notifications to re-mark as unread.

**Priority:** 🟢 Low

---

### SUG-NOTIF-010 — Toast on Successful Actions

**Problem:** When "Mark All Read" or "Delete" succeeds, there's no success feedback. Users can't tell if the action worked silently.

**Fix:**
```js
const [successMsg, setSuccessMsg] = useState(null);
// After successful mutation:
setSuccessMsg('Notification deleted');
setTimeout(() => setSuccessMsg(null), 3000);

// Show Snackbar:
<Snackbar open={!!successMsg} message={successMsg} autoHideDuration={3000} />
```

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-NOTIF-PLAN-001 — Add TC: Topbar Bell Badge Count

> **TC-NOTIF-00** — Bell icon badge in topbar  
> Navigate to any page while logged in.  
> Verify: Bell icon visible in topbar. Red badge chip shows number of unread notifications.  
> Click bell: opens popover OR navigates to `/notifications`.  
> **OBS:** Currently opens a popover, not a direct navigation. Popover shows "View All Notifications" link.

### SUG-NOTIF-PLAN-002 — Add TC: Popover vs Page Data Sync

> **TC-NOTIF-00B** — Topbar popover and page show same data  
> Open topbar bell popover. Record notification count.  
> Navigate to `/notifications`. Record count.  
> Expected: same data. Current state: **inconsistent** — popover shows 3, page empty.

### SUG-NOTIF-PLAN-003 — Add TC: Type Icon Mapping (Live)

> **TC-NOTIF-09B** — Live type icon verification  
> Requires mock notification data. For each type:  
> - `appointment` → CalendarMonthIcon, blue bg (#DBEAFE)  
> - `payment` → CreditCardIcon, green bg (#D1FAE5)  
> - `alert` with `priority='normal'` → AlertIcon, grey bg (#F3F4F6)  
> - `alert` with `priority='high'` → AlertIcon, **red bg (#FEE2E2)**  
> - unknown type → InfoIcon, grey bg

### SUG-NOTIF-PLAN-004 — Add TC: timeAgo() Boundary Values

> **TC-NOTIF-11B** — Time boundary accuracy  
> Create notifications with fixed `created_at`:  
> - 30 seconds ago → "just now"  
> - 59 minutes ago → "59m ago"  
> - 60 minutes ago → "1h ago"  
> - 23h 59min ago → "23h ago"  
> - 24h ago → "1d ago"

### SUG-NOTIF-PLAN-005 — Add TC: noWrap Title Ellipsis (E4)

> **TC-NOTIF-20** — Very long title ellipsis  
> Create notification with 200-char title.  
> Verify: `noWrap` truncates with `...` at card width.  
> Source: Line 174: `<Typography fontWeight={700} noWrap>`.

### SUG-NOTIF-PLAN-006 — Add TC: Priority Flag Overrides Icon Colour

> **TC-NOTIF-09C** — High priority appointment shows red, not blue  
> Create appointment notification with `priority='high'`.  
> Expected icon box: red bg (#FEE2E2) — not blue.  
> Documents the `iconColor()` priority-first logic (may surprise users).

### SUG-NOTIF-PLAN-007 — Add TC: Error Alert Close Button

> **TC-NOTIF-16B** — Error alert close button  
> Trigger a mutation error. Confirm red Alert with error text appears.  
> Click the × close button. Verify Alert disappears (`setActionError(null)`).

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-NOTIF-001 | Fix topbar/page data inconsistency | 🐛 Bug | 🔴 High |
| SUG-NOTIF-002 | Confirm before delete | 🐛 UX Safety | 🔴 High |
| SUG-NOTIF-003 | Add `skip: !user?.id` auth guard | 🛡 Security | 🔴 High |
| SUG-NOTIF-004 | Prevent concurrent mutation race | 🐛 Race Condition | 🟡 Medium |
| SUG-NOTIF-005 | Loading state for Mark All Read | ✨ UX | 🟡 Medium |
| SUG-NOTIF-006 | Show notification counts in filter | ✨ UX | 🟡 Medium |
| SUG-NOTIF-007 | Document priority-vs-type icon logic | 📋 Docs | 🟡 Medium |
| SUG-NOTIF-008 | Pause polling on hidden tab | ⚡ Performance | 🟢 Low |
| SUG-NOTIF-009 | Mark as Unread option | ✨ Feature | 🟢 Low |
| SUG-NOTIF-010 | Success toast on actions | ✨ UX | 🟢 Low |

### Quick Wins (< 5 min):
- **SUG-NOTIF-003**: Add `skip: !user?.id` (1 line)
- **SUG-NOTIF-001**: Add mock fallback array for offline (5 lines)
