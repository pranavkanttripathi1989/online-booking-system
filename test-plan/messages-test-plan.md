# Messages — Test Plan

**Feature area:** `/src/pages/messages/index.jsx`  
**Route tested:** `/messages`  
**Mock data:** Inline mock conversations and messages  
**Access:** All authenticated roles

---

## 1. Messages List / Inbox

### TC-MSG-001 — Inbox loads with conversation list
**Prompt:**  
> Log in and navigate to `http://localhost:3001/messages`.  
> Assert: left panel shows list of conversations with: sender avatar, name, last message preview, timestamp, unread badge (3 indicator in sidebar).

**Expected:** Conversation list renders with mock chat threads. Unread badge visible.

---

### TC-MSG-002 — Click conversation opens message thread
**Prompt:**  
> On `/messages`, click on any conversation in the left panel.  
> Assert: right panel shows the full message thread. Sent messages on right (teal), received on left (grey).

**Expected:** Thread view renders. Message bubbles styled correctly.

---

### TC-MSG-003 — Send a new message
**Prompt:**  
> In an open conversation, type "Hello, how are you?" in the message input at the bottom. Press Enter or click Send.  
> Assert: message appears in the thread as a sent message (right side, teal bubble). Input field clears.

**Expected:** New message appended to thread. State updates. Input cleared.

---

### TC-MSG-004 — Search conversations
**Prompt:**  
> On `/messages`, type "Sara" in the search field above the conversation list.  
> Assert: conversation list filters to show only threads with "Sara".

**Expected:** `search` state filters `conversations` array. Matching threads shown.

---

### TC-MSG-005 — New conversation / compose button
**Prompt:**  
> Click the compose / "New Message" button (pencil icon or similar) if present.  
> Assert: a dialog or sidepanel opens to select a patient/clinician as recipient.

**Expected:** New conversation UI opens. Recipient search visible.

---

### TC-MSG-006 — Unread count clears after reading
**Prompt:**  
> On the sidebar, "Messages" nav item shows badge "3". Click on Messages → click an unread conversation.  
> Assert: after viewing the conversation, the unread badge count decreases.

**Expected:** Mark-as-read logic triggers. Badge updates.

---

### TC-MSG-007 — Messages page is responsive (mobile)
**Prompt:**  
> Resize browser to 375px. Navigate to `/messages`.  
> Assert: either conversation list OR thread view is shown (not compressed side-by-side). Back button to return to list.

**Expected:** Responsive layout — list/detail split adapts to mobile.
