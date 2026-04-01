# Messages — Test Suggestions & Implementation Status (Final)

**Module:** Messages / Inbox
**Last Updated:** 2026-03-31 (Session QA)

---

## Bug Fix Suggestions

| ID | Bug | Priority | Status | Notes |
|----|-----|----------|--------|-------|
| SUG-MSG-001 | Mark thread as read on select (clear unread dot + sidebar badge) | 🔴 High | ✅ COMPLETED | `handleSelectThread` calls `MockStore.markThreadAsRead`; `AppShell` subscribes to store for live badge |
| SUG-MSG-002 | Add compose button to start a new conversation | 🔴 High | ✅ COMPLETED | Teal pencil `IconButton` inline with search bar; "New Message" dialog with grouped Autocomplete |
| SUG-MSG-003 | Add mobile back button in thread view | 🟡 Medium | ✅ COMPLETED | `ArrowBackRoundedIcon` in thread header, `isMobile && (<IconButton onClick={() => setActiveThread(null)} />)` |
| SUG-MSG-004 | Fix search filter race condition | 🟡 Medium | ✅ COMPLETED | Replaced inline JSX filter with `useMemo([threads, searchQ])` |

---

## Feature Suggestions

| ID | Suggestion | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| SUG-MSG-005 | Conversation type labels (Patient/Clinician/Staff role chips) | 🟡 Medium | ✅ COMPLETED | `ROLE_STYLE` map + `RoleChip` component; visible in contact list and thread header |
| SUG-MSG-006 | Message delivery status ticks (✓ sent, ✓✓ green = read) | 🟡 Medium | ✅ COMPLETED | `DoneRoundedIcon`/`DoneAllRoundedIcon` with tooltip on sent messages |
| SUG-MSG-007 | Quick reply shortcut from appointment detail page | 🟢 Low | ⏳ DEFERRED | Requires cross-page state or URL params. Deferred to next sprint. |
| SUG-MSG-008 | Attachment / file upload support | 🟢 Low | ⏳ DEFERRED | Requires file handling mock. Deferred to next sprint. |

---

## Session QA Fixes (New)

| ID | Fix | Priority | Status | Notes |
|----|-----|----------|--------|-------|
| SUG-MSG-009 | aria-labels on all icon buttons | 🟡 Medium | ✅ COMPLETED | compose btn (`"New message"`), back btn (`"Back to inbox"`), call (`"Start voice call"`), video (`"Start video call"`), info (`"Conversation info"`), attach (`"Attach file"`), emoji (`"Insert emoji"`) |
| SUG-MSG-010 | ErrorBoundary wrapper on MessagesPage | 🟡 Medium | ✅ COMPLETED | `MessagesPageWithBoundary` export wraps `MessagesPage` in `<ErrorBoundary>` |

---

## Deferred / Out of Scope

| Item | Reason |
|------|--------|
| SUG-MSG-007 Quick reply from appointment | Cross-page routing state needed; out of scope for this session |
| SUG-MSG-008 Attachment upload | Mock file handling not implemented; deferred |
| Real-time WebSocket typing indicators | Backend required; mock-only scope |
| Message read receipts per-user | Complex multi-user state; backend required |

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-MSG-001 | Unread badge clear on thread select | ✅ COMPLETED |
| SUG-MSG-002 | Compose new message button + dialog | ✅ COMPLETED |
| SUG-MSG-003 | Mobile back button in thread view | ✅ COMPLETED |
| SUG-MSG-004 | Search useMemo (no race condition) | ✅ COMPLETED |
| SUG-MSG-005 | Role type labels (Patient/Clinician/Staff) | ✅ COMPLETED |
| SUG-MSG-006 | Delivery ticks (✓/✓✓) on sent messages | ✅ COMPLETED |
| SUG-MSG-007 | Quick reply from appointments | ⏳ DEFERRED |
| SUG-MSG-008 | Attachment upload | ⏳ DEFERRED |
| SUG-MSG-009 | aria-labels on all icon buttons | ✅ COMPLETED |
| SUG-MSG-010 | ErrorBoundary wrapper | ✅ COMPLETED |
