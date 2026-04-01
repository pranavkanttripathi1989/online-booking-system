# Messages — Test Plan

**Module:** Messages / Inbox  
**Version:** 2.0 (Updated post-fix 2026-03-20)  
**Environment:** `http://localhost:3001` — Vite dev server, mock data (`VITE_MOCK_MODE=true`), no backend required  
**Prereq:** Log in as Admin (`admin@medibook.com`). Navigate to `/messages`.

---

## Test Cases

### TC-MSG-001 — Inbox loads with conversation list
| Field | Value |
|-------|-------|
| **Objective** | Verify conversations load on page entry |
| **Steps** | Navigate to `/messages`. Observe left panel. |
| **Expected** | ≥ 1 conversation shown. Each has: avatar (initials), name, last-message preview, timestamp, role label (Patient/Clinician/Staff). Sidebar "Messages" nav badge shows unread count. |
| **New Checks** | Role label chip (Patient/Clinician/Staff) visible under each name. Compose pencil button visible to the right of search bar. |

---

### TC-MSG-002 — Click conversation opens thread
| Field | Value |
|-------|-------|
| **Objective** | Verify right panel updates on conversation click |
| **Steps** | Click any conversation in the left panel. |
| **Expected** | Thread view renders. Sent messages on right (blue bubble). Received on left (grey). Timestamp below each. Delivery tick (✓/✓✓) on sent messages. |

---

### TC-MSG-003 — Send a message in existing thread
| Field | Value |
|-------|-------|
| **Objective** | Verify message sending in existing conversation |
| **Steps** | Open any thread. Type "Hello QA test." in the input box. Press Enter or click Send. |
| **Expected** | Message appears as sent bubble (right, blue). Input clears. Grey ✓ tick shown. Thread `last_message` updates. |
| **Edge Cases** | Empty input: Send button disabled. Shift+Enter: newline, does not send. |

---

### TC-MSG-004 — Search conversations
| Field | Value |
|-------|-------|
| **Objective** | Verify search filters conversations by name or message content |
| **Steps** | Type "Alice" in the search box. Observe list. Clear search. |
| **Expected** | Only conversations matching "Alice" shown. Clearing restores full list. useMemo prevents stale results — no race condition. |
| **Edge Cases** | Typing "ZZZZNOTEXIST" → "No conversations found" empty state with search icon. |

---

### TC-MSG-005 — Compose new message
| Field | Value |
|-------|-------|
| **Objective** | Verify compose flow creates a new conversation or sends to existing |
| **Steps** | 1. Click the teal pencil icon button next to the search bar. 2. Select a recipient from autocomplete. 3. Type a message. 4. Click Send. |
| **Expected** | "New Message" dialog opens. Autocomplete groups by Patients/Clinicians. Send button disabled until both recipient and message filled. Dialog closes on send. Thread opens with sent message visible. |
| **Edge Cases** | Selecting a recipient who already has a thread → send to existing thread, not create duplicate. |

---

### TC-MSG-006 — Unread count clears after reading
| Field | Value |
|-------|-------|
| **Objective** | Verify unread badges clear on thread selection |
| **Steps** | Note initial sidebar badge and red unread dots. Click an unread conversation. |
| **Expected** | Red unread dot disappears from that conversation row. Sidebar "Messages" badge decrements by 1. |
| **Implementation** | `handleSelectThread` → `MockStore.markThreadAsRead(thread.id, userId)`. AppShell subscribes to store for live count. |

---

### TC-MSG-007 — Mobile responsiveness with back button
| Field | Value |
|-------|-------|
| **Objective** | Verify single-panel layout and back navigation on mobile |
| **Steps** | Resize browser to ≤ 600px. Navigate to `/messages`. Click a conversation. Click ← back button. |
| **Expected** | At ≤ 600px: only conversation list **or** thread view visible (not both). Thread has `←` icon button at top-left. Clicking it returns to conversation list. |
| **Implementation** | `isMobile = useMediaQuery(theme.breakpoints.down('sm'))`. `showList = !isMobile || !activeThread`. Back button: `onClick={() => setActiveThread(null)}`. |

---

### TC-MSG-008 — Empty search state
| Field | Value |
|-------|-------|
| **Objective** | Verify graceful empty state when search has no matches |
| **Steps** | Type a string that matches no conversation (e.g. "ZZZZXXX"). |
| **Expected** | Empty state shown: search icon + "No conversations found" + "Try a different name or keyword". No white screen or crash. |

---

### TC-MSG-009 — Send empty message (validation)
| Field | Value |
|-------|-------|
| **Objective** | Verify Send button is disabled when input is empty |
| **Steps** | Open a thread. Do not type anything. Check Send button state. |
| **Expected** | Send button is grayed-out/disabled. Clicking it does nothing. No empty message appears. |

---

## Regression Test Coverage

| Area | TC |
|------|-----|
| Inbox load | TC-MSG-001 |
| Thread open | TC-MSG-002 |
| Send message | TC-MSG-003 |
| Search + filter | TC-MSG-004, TC-MSG-008 |
| Compose new | TC-MSG-005 |
| Unread badge | TC-MSG-006 |
| Mobile layout | TC-MSG-007 |
| Input validation | TC-MSG-009 |

---

## Feature Coverage Matrix

| Feature | Implemented | Tested |
|---------|-------------|--------|
| Conversation list | ✅ | TC-MSG-001 |
| Thread view | ✅ | TC-MSG-002 |
| Send message | ✅ | TC-MSG-003 |
| Search (useMemo) | ✅ | TC-MSG-004, TC-MSG-008 |
| Compose dialog | ✅ | TC-MSG-005 |
| Unread clear + badge sync | ✅ | TC-MSG-006 |
| Mobile back button | ✅ | TC-MSG-007 |
| Role labels (Patient/Clinician/Staff) | ✅ | TC-MSG-001 |
| Delivery tick (SUG-MSG-006) | ✅ | TC-MSG-002, TC-MSG-003 |
| Empty input guard | ✅ | TC-MSG-009 |
| aria-labels on icon buttons | ✅ | TC-MSG-010 |
| ErrorBoundary wrapper | ✅ | TC-MSG-011 |
| Attachment upload | ❌ Deferred | — |
| Typing indicators | ❌ Deferred | — |

---

## Session QA TCs

### TC-MSG-010 — aria-labels on Icon Buttons
| Field | Value |
|-------|-------|
| **Objective** | Verify all icon buttons have accessible aria-label attributes |
| **Steps** | Inspect DOM elements for compose, back, send, call, video, info, attach, emoji buttons. |
| **Expected** | Each icon button has a descriptive `aria-label`: "New message", "Back to inbox", "Start voice call", "Start video call", "Conversation info", "Attach file", "Insert emoji". |

---

### TC-MSG-011 — ErrorBoundary Wrapper
| Field | Value |
|-------|-------|
| **Objective** | Verify MessagesPage is wrapped in an ErrorBoundary for crash resilience |
| **Steps** | Check that the default export is `MessagesPageWithBoundary` wrapping `<ErrorBoundary><MessagesPage /></ErrorBoundary>`. |
| **Expected** | Any render crash in MessagesPage is caught and shows a fallback UI instead of white-screening the app. |

---

## Total: 11 Test Cases

