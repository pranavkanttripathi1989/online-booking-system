# Messages — Test Suggestions & Implementation Status

**Module:** Messages / Inbox  
**Last Updated:** 2026-03-20  

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
| SUG-MSG-005 | Conversation type labels (Patient/Clinician/Staff role chips with icons/colors) | 🟡 Medium | ✅ COMPLETED | `ROLE_STYLE` map + `RoleChip` component; visible in contact list and thread header |
| SUG-MSG-006 | Message delivery status ticks (✓ sent, ✓✓ green = read by recipient) | 🟡 Medium | ✅ COMPLETED | `DoneRoundedIcon`/`DoneAllRoundedIcon` with tooltip on sent messages |
| SUG-MSG-007 | Quick reply shortcut from appointment detail page | 🟢 Low | ⏳ DEFERRED | Would require cross-page state or URL params. Deferred to next sprint. |
| SUG-MSG-008 | Attachment / file upload support | 🟢 Low | ⏳ DEFERRED | Requires file handling mock. Deferred to next sprint. |

---

## Additional Code Quality Improvements Applied

| Improvement | Rationale |
|-------------|-----------|
| `useEffect` subscription uses `[]` + `activeThreadRef` pattern | Prevents re-subscription on every thread click (memory leak) |
| Empty search state with icon + message | Better UX when no conversations match search |
| Grouped Autocomplete in compose dialog | Patients and clinicians separated with role icons |
| `AppShell` `NAV_CONFIG` Messages badge changed from hardcoded `3` to `0`; subscribes to MockStore | Dynamic badge stays in sync with actual unread count |
| `send` button disabled when input empty | Prevents empty message submission |
| `fontSize: '16px'` on mobile message input | Prevents iOS auto-zoom on focus |
| `multiline maxRows={3}` on input | Graceful handling of long messages |
| Tooltips on all icon action buttons | Accessibility + discoverability |

---

## Deferred / Out of Scope

| Item | Reason |
|------|--------|
| SUG-MSG-007 Quick reply from appointment | Cross-page routing state needed; out of scope for this sprint |
| SUG-MSG-008 Attachment upload | Mock file handling not implemented; defer |
| Real-time WebSocket typing indicators | Backend required; mock-only scope |
| Message read receipts per-user | Complex multi-user state; backend required |
