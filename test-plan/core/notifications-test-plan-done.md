# Notifications Page — Test Plan

**Route:** `/notifications`
**File:** `frontend/src/pages/notifications/index.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

A real-time notifications inbox with Unread/All filter toggle, Mark All Read button, per-notification Mark Read and Delete actions. Polls at 30s intervals via `GET_NOTIFICATIONS` Apollo query. Type-based icons (appointment=calendar, payment=card, alert=warning) with priority-based colour coding.

---

## Test Cases

### TC-NOTIF-01 — Page Load: Spinner Before Data
**Steps:** Navigate to `/notifications` before Apollo resolves.
**Expected:**
- `CircularProgress` spinner shown centred.
- No crash.

---

### TC-NOTIF-02 — Default Filter: Unread
**Steps:** Page loads.
**Expected:**
- "Unread" toggle button is active (has boxShadow, primary colour, fontWeight 700).
- Query fires with `{ filter: 'unread' }`.

---

### TC-NOTIF-03 — Filter Toggle: Unread → All
**Steps:** Click "All" in the filter toggle.
**Expected:**
- `filter` state changes to `'all'`.
- Query re-fires with `{ filter: 'all' }`.
- All notifications (read + unread) shown.

---

### TC-NOTIF-04 — Filter Toggle: All → Unread
**Steps:** After switching to All, click "Unread".
**Expected:**
- Returns to unread-only view.

---

### TC-NOTIF-05 — Empty State: No Unread Notifications
**Steps:** All notifications are marked read.
**Expected:**
- Card with "No unread notifications" message shown.
- Bell icon (64px, `text.disabled`).

---

### TC-NOTIF-06 — Empty State: No All Notifications
**Steps:** Zero notifications in system.
**Expected:**
- Card with "No notifications" message.

---

### TC-NOTIF-07 — Notification Card: Unread Indicator
**Steps:** View an unread notification card.
**Expected:**
- Left border: `4px solid primary.main`.
- Unread = blue left stripe.

---

### TC-NOTIF-08 — Notification Card: Read State (No Border)
**Steps:** View a read notification card.
**Expected:**
- No left border (`borderLeft: 'none'`).

---

### TC-NOTIF-09 — Notification Card: Type-Specific Icon
**Steps:** View cards with types: appointment, payment, alert, info.
**Expected:**
- appointment → `CalendarMonthIcon` (blue bg).
- payment → `CreditCardIcon` (green bg).
- alert → `AlertIcon` (red bg, for `priority='high'`).
- default → `InfoIcon` (grey bg).

---

### TC-NOTIF-10 — Notification Card: High Priority Chip
**Steps:** View a notification with `priority='high'`.
**Expected:**
- Red "High Priority" chip shown next to type chip.
- Icon background is red (`bg: '#FEE2E2'`).

---

### TC-NOTIF-11 — Notification Card: Time Display
**Steps:** View various notification timestamps.
**Expected:**
- < 1 min → "just now".
- < 60 min → "{N}m ago".
- < 24h → "{N}h ago".
- ≥ 24h → "{N}d ago".

---

### TC-NOTIF-12 — Mark as Read: Single Notification
**Steps:** Click the check icon on an unread notification.
**Expected:**
- `MARK_READ` mutation fires with `{ id }`.
- After `refetch()`, notification card loses left border.
- Check icon disappears (card now read).

---

### TC-NOTIF-13 — Mark All as Read Button Visibility
**Steps:** View page with at least one unread notification.
**Expected:**
- "Mark All Read" button with `CheckIcon` visible.
- When `hasUnread = false` (all read), button hidden.

---

### TC-NOTIF-14 — Mark All as Read: Button Click
**Steps:** Click "Mark All Read".
**Expected:**
- `MARK_ALL_READ` mutation fires.
- After refetch, all cards lose left border.
- "Mark All Read" button disappears.

---

### TC-NOTIF-15 — Delete Notification
**Steps:** Click the red delete icon on any notification.
**Expected:**
- `DELETE_NOTIF` mutation fires with `{ id }`.
- After refetch, card removed from list.

---

### TC-NOTIF-16 — Action Error Display
**Steps:** Mock any mutation to throw a network error.
**Expected:**
- Red `Alert` "Error message" shown at top of page.
- Alert has `onClose` → click X to dismiss.

---

### TC-NOTIF-17 — Action Error Clears on Next Action
**Steps:** Trigger error; then successfully perform another action.
**Expected:**
- `setActionError(null)` called at the start of each action.
- Error alert disappears.

---

### TC-NOTIF-18 — Polling Every 30s
**Steps:** Wait 30s on the page.
**Expected:**
- Apollo query auto-refetches (`pollInterval: 30000`).
- New notifications appear without manual refresh.

---

### TC-NOTIF-19 — Hover Effect on Cards
**Steps:** Hover over a notification card.
**Expected:**
- Box shadow increases (`boxShadow: 3`).
- Smooth CSS transition.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Notification with no `created_at` | `timeAgo` returns `''`; timestamp area empty |
| E2 | Unknown notification type | Falls through to `InfoIcon` with grey colours |
| E3 | Apollo query fails on initial load | `loading` resolves to false; `notifications = []`; empty state shown |
| E4 | Very long notification title | `noWrap` prevents overflow; ellipsis applied |
| E5 | Very long notification message | No clamping — message wraps naturally |
| E6 | Clicking delete while another action is pending | Both mutations fire independently; no race condition guard |
| E7 | `user` not logged in (auth missing) | Apollo query still fires; backend 401 causes `actionError` to be shown |
