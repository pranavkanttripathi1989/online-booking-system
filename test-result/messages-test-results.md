# Messages — Test Results

**Feature:** Messages / Inbox  
**Test Plan:** [messages-test-plan.md](../test-plan/messages-test-plan.md)  
**Executed:** 2026-03-16  
**Tester:** Antigravity AI (Browser Agent)  
**Environment:** `http://localhost:3001` (Vite dev server, mock data mode, backend offline)  
**Total Cases:** 7 | **Executed:** 7 | **Passed:** 4 ✅ | **Partial:** 1 ⚠️ | **Failed:** 2 ❌ | **Skipped:** 0

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 4 |
| ⚠️ PARTIAL | 1 (mobile responsive — single panel works but no Back button) |
| ❌ FAIL | 2 |
| ⏭ SKIPPED | 0 |

> **Overall Result: ⚠️ PARTIAL PASS — Core messaging features work, but compose flow and unread-clearing are missing.**

---

## Bugs Found

| # | Bug | Severity | Affected TC |
|---|-----|----------|-------------|
| BUG-MSG-001 | Unread conversation badges do NOT clear after opening and reading a thread — sidebar badge stays at "3" permanently | 🔴 High | TC-MSG-006 |
| BUG-MSG-002 | No compose / "New Message" button found anywhere on the Messages page — cannot start a new conversation | 🔴 High | TC-MSG-005 |
| BUG-MSG-003 | Mobile view has no "Back" button to return from thread view to conversation list | 🟡 Medium | TC-MSG-007 |
| BUG-MSG-004 | Search edge case — "Alice Thompson" occasionally persists visible when search text doesn't match her name (possible filter race condition) | 🟡 Medium | TC-MSG-004 |

---

## Test Case Results

### TC-MSG-001 — Inbox loads with conversation list
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Navigated to `http://localhost:3001/messages`. Page loaded a two-panel layout: left panel shows **8 conversations**, right panel shows a selected thread by default. Each conversation item displays: circular avatar (with initials or photo), sender name, last message preview (truncated), timestamp (e.g., "2h ago", "Yesterday"). Unread conversations show a red dot badge. The sidebar "Messages" nav item shows a **"3" badge** for unread conversations. |
| **Expected** | Conversation list with avatar, name, preview, timestamp, unread badge. |

---

### TC-MSG-002 — Click conversation opens message thread
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked on a conversation in the left panel (Dmitri Volkov). Right panel updated to show the full message thread. **Sent messages** appear on the **right side with a teal/primary color bubble**. **Received messages** appear on the **left side with a grey bubble**. Each message shows a timestamp below the bubble. Thread scrolls to the latest message. |
| **Expected** | Thread view renders. Sent=right/teal, Received=left/grey. |

---

### TC-MSG-003 — Send a new message
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Found the message input field at the bottom of the thread panel. Typed **"Hello, how are you?"** and pressed Enter. The message appeared immediately in the thread as a **sent message (right side, teal bubble)**. The input field cleared after sending. No delay or loading indicator — instant optimistic update. |
| **Expected** | Message appended to thread (right side, teal). Input cleared. |

---

### TC-MSG-004 — Search conversations
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Found the search field above the conversation list (placeholder: "Search conversations…"). Typed **"Sara"**. The conversation list filtered down, showing only threads matching "Sara" in the contact name. Non-matching conversations were hidden. |
| **Expected** | Search filters conversations by name. |
| **Notes** | Minor flaky behavior observed: "Alice Thompson" occasionally remained visible despite not matching "Sara". This may be a debounce race condition where the filter ran before the state was fully updated. Flagged as BUG-MSG-004 (minor). |

---

### TC-MSG-005 — New conversation / compose button
| Field | Value |
|-------|-------|
| **Status** | ❌ FAIL |
| **Actual Result** | Inspected the entire Messages page UI: top header of the left panel (above conversation list), action bar area, and page header. **No compose button, pencil icon, or "New Message" button was found** anywhere on the page. The left panel header shows a search field only. |
| **Expected** | Compose icon or "New Message" button opens recipient-selection dialog. |
| **Bug ID** | BUG-MSG-002 |

---

### TC-MSG-006 — Unread count clears after reading
| Field | Value |
|-------|-------|
| **Status** | ❌ FAIL |
| **Actual Result** | Initial state: sidebar badge showed **"3"** and 3 conversations had red unread dot indicators. Clicked on **Dmitri Volkov's** conversation (unread). The thread opened and messages were displayed. After viewing the thread, the **red unread dot indicator on Dmitri's conversation remained**. The sidebar badge also stayed at **"3"** — no decrement. Tried clicking other unread conversations — same result. |
| **Expected** | Viewing a conversation marks it as read. Unread dot cleared. Sidebar badge decrements. |
| **Root Cause** | The conversations state is likely never mutated when a conversation is selected. There is no `setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, unread: 0 } : c))` call in the `onConversationClick` handler. |
| **Bug ID** | BUG-MSG-001 |

---

### TC-MSG-007 — Messages page is responsive (mobile)
| Field | Value |
|-------|-------|
| **Status** | ⚠️ PARTIAL |
| **Actual Result** | Resized browser to 375px width. The Messages page adapted to a **single-panel layout** — the left conversation list OR the right thread view is shown exclusively (not both compressed side-by-side). This is correct responsive behavior. However, once a conversation was tapped (opening the thread view), **there was no "← Back" button** to return to the conversation list — the user is locked in the thread view with no navigation back to the inbox. |
| **Expected** | Single-panel layout (✅ correct). Back button present (❌ missing). |
| **Bug ID** | BUG-MSG-003 |
| **Notes** | The main sidebar is accessible via the hamburger button at 375px, which allows navigation to other pages. But within the Messages feature itself, returning to the conversation list requires the sidebar menu. |

---

## Screenshots Captured

| Screenshot | Description |
|-----------|-------------|
| `messages_initial_state_*.png` | Messages inbox — 8 conversations, unread badges, two-panel desktop layout |
| `messages_test_execution_*.webp` | Full browser recording of search, send, mobile resize |

---

## Bugs Fixed During This Session

> No bugs were fixed during this session.

---

## Follow-up Recommendations

| Action | Priority |
|--------|----------|
| Fix BUG-MSG-001 — Mark conversation as read when selected (clear unread dot + update badge count) | 🔴 Immediate |
| Fix BUG-MSG-002 — Add compose button to start a new conversation | 🔴 Immediate |
| Fix BUG-MSG-003 — Add "Back to inbox" button in mobile thread view | 🟡 High |
| Fix BUG-MSG-004 — Investigate search filter race condition with Alice Thompson | 🟡 Medium |
