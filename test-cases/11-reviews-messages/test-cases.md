# Reviews & Messages — Test Cases

**Domain covers:** patient reviews of clinicians/clinics (`Reviews` model — stars, comment, manager/clinician reply) and patient↔clinician↔staff messaging threads (`MessageThreads`/`MessageParticipants`/`Messages`). Both are the two domains `context/backend-implementation-plan.md` Phase 11 flags as **net-new**: no GraphQL contract exists for either today, and the mock store's field shapes are a starting guess, not a binding contract, per Phase 0's open questions.
**Grounded in:** `schema.prisma` (`Reviews`, `MessageThreads`, `MessageParticipants`, `Messages`), `context/backend-implementation-plan.md` Phase 11 + Phase 0 (mock-shape inspection notes), `context/frontend-contract-analysis.md §2` ("Reviews / Messages — No GraphQL operations exist at all... both pages read/write exclusively through `MockStore`"), `test-plan/reviews-test-plan.md`, `test-plan/shared/reviews-page-test-plan-done.md`, `test-result/reviews-test-results.md`, `test-suggestion/reviews-test-suggestion.md`, `test-plan/messages-test-plan.md`, `test-result/messages-test-results.md`, `test-suggestion/messages-test-suggestion.md`.
**Note on IDs:** this file uses `TC-REV-*` and `TC-MSG-*` prefixes side by side within each of the four sections, since the domain groups two related but distinct features, mirroring how the file itself covers both.

---

## 1. Unit Test Cases

### Reviews

#### TC-REV-UNIT-001 — Average rating calculation matches `(sum of stars / total) .toFixed(1)`
- **Priority:** High
- **Preconditions:** Grounded in `test-result/reviews-test-results.md` TC-REV-02/TC-REV-26 (mock: 15 reviews averaging 4.3).
- **Steps:** Compute the average for a set of `stars` values `[5,5,5,5,5,5,5,5,4,4,4,4,3,3,2]`.
- **Expected Result:** Returns `"4.3"` — rounds to exactly one decimal place, and the average is computed from the full dataset even when a star filter is currently narrowing the visible list (per `TC-REV-09`/`TC-REV-26`: filtering to "5★" must NOT change the displayed average to 5.0).

### TC-REV-UNIT-002 — Rating breakdown percentages sum to 100% (or account for rounding)
- **Priority:** Medium
- **Steps:** Compute the 5★–1★ breakdown percentages for the same 15-review dataset.
- **Expected Result:** 53% / 27% / 13% / 7% / 0% — matches `test-result/reviews-test-results.md` TC-REV-03 exactly; the five percentages sum to 100 (or the rounding remainder is absorbed predictably, e.g. always into the largest bucket).

### TC-REV-UNIT-003 — Search matches on patient name OR clinician name, case-insensitively
- **Priority:** High
- **Preconditions:** Grounded in TC-REV-10/11/14 (`reviews-test-plan.md`).
- **Steps:** Run the review-search predicate with query `"GEORGE"` against a review whose `clinician_name` contains `"George"`.
- **Expected Result:** Matches — proves both the OR logic across the two fields and the `.toLowerCase()` normalization on both sides of the comparison.

### TC-REV-UNIT-004 — Reply submit is blocked for whitespace-only text
- **Priority:** Medium
- **Preconditions:** Grounded in TC-REV-17/23/28.
- **Steps:** Validate reply text `"   "` (three spaces) and `""`.
- **Expected Result:** Both evaluate as falsy after `.trim()` — the "Submit Response" action must stay disabled for either, guarding against a reply consisting only of whitespace being persisted.

### TC-REV-UNIT-005 — `initials()` handles a missing/empty name without crashing
- **Priority:** Low
- **Preconditions:** Grounded in edge case E3 in `test-plan/reviews-test-plan.md`.
- **Steps:** Call `initials('')` and `initials(undefined)`.
- **Expected Result:** Both return `''` (empty string) rather than throwing — the avatar renders empty, not a broken component.

### Messages

### TC-MSG-UNIT-006 — Thread `unread_count` increments per-recipient, not globally
- **Priority:** Critical
- **Preconditions:** A `MessageThreads` row with two `MessageParticipants` (Patient A, Clinician C).
- **Steps:** Clinician C sends a message into the thread.
- **Expected Result:** Patient A's `MessageParticipants.unread_count` increments by 1; Clinician C's own `unread_count` (the sender) does not — unread counts are per-participant, matching the join-table design in `schema.prisma` rather than a single thread-level counter.

### TC-MSG-UNIT-007 — Messages within a thread are ordered strictly by `sent_at`
- **Priority:** High
- **Steps:** Insert 3 messages into a thread with out-of-order `sent_at` values (simulating clock skew or retry), then fetch the thread's messages.
- **Expected Result:** Returned in ascending `sent_at` order, not insertion order — the UI's chat-bubble rendering depends on strict chronological order.

### TC-MSG-UNIT-008 — Conversation search matches on participant name OR last message content
- **Priority:** Medium
- **Preconditions:** Grounded in TC-MSG-004 (`messages-test-plan.md`).
- **Steps:** Run the conversation-search predicate with a query matching only the `last_message` text, not any participant's name.
- **Expected Result:** Still matches — confirms the search covers both dimensions the existing mock UI already implements, so the backend-driven search doesn't regress to name-only.

### TC-MSG-UNIT-009 — Find-or-create thread logic reuses an existing 1:1 thread instead of duplicating it
- **Priority:** Critical
- **Preconditions:** Grounded in the edge case noted in `test-plan/messages-test-plan.md` TC-MSG-005 ("Selecting a recipient who already has a thread → send to existing thread, not create duplicate").
- **Steps:** Call the compose-resolve-recipient logic for a recipient who already shares a `MessageThreads` row with the current user.
- **Expected Result:** Returns the existing `thread_id` — never creates a second `MessageThreads` row for the same pair of participants within the same organization.

### TC-MSG-UNIT-010 — Delivery-tick status derives correctly from `read_at`
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-MSG-006` (delivery ticks — implemented).
- **Steps:** Compute the tick state for a sent message with `read_at: null` and again with `read_at` set.
- **Expected Result:** `null` → single grey tick (sent, unread); set → double tick, styled as read — matches the `✓`/`✓✓` UX already built against the mock.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks. This is the one domain where the schema/contract itself needs a short design pass with frontend before finalizing, per Phase 11 — these cases assume the `Reviews`/`MessageThreads` shapes already added to `schema.prisma`.*

### Reviews

### TC-REV-API-001 — `createReview` only succeeds for a completed appointment belonging to the calling patient
- **Priority:** Critical
- **Preconditions:** An `Appointments` row with `status: 'completed'`, `patient_id` = the calling patient's own patient record.
- **Steps:** Call `createReview(appointmentId, stars: 5, comment: "Great visit")`.
- **Expected Result:** Succeeds, creating a `Reviews` row linked to that appointment/patient/clinician/clinic. Repeating the exact same call for an appointment belonging to a DIFFERENT patient (row-level check) is rejected — mirrors `TC-AUTH-API-008`'s ownership pattern.

### TC-REV-API-002 — `createReview` rejects a review for a non-completed appointment
- **Priority:** High
- **Preconditions:** An appointment with `status: 'scheduled'` or `'cancelled'`.
- **Steps:** Attempt `createReview` against it.
- **Expected Result:** Rejected — a patient cannot review a visit that hasn't happened yet or was cancelled.

### TC-REV-API-003 — `createReview` enforces one review per appointment
- **Priority:** High
- **Preconditions:** A review already exists for a given `appointment_id`.
- **Steps:** Attempt a second `createReview` for the same `appointment_id`.
- **Expected Result:** Rejected with a clear "already reviewed" error, not a second silently-created row — the schema allows an appointment to have multiple `Reviews[]` relationally, so this must be an application-level uniqueness rule, not assumed from the schema shape alone.

### TC-REV-API-004 — `respondToReview` is restricted to the review's own clinician or a manager/admin of that clinic
- **Priority:** Critical
- **Preconditions:** A review for Clinician C1 at Clinic X.
- **Steps:** Attempt `respondToReview` as Clinician C2 (different clinician, same org), then as the manager of Clinic X.
- **Expected Result:** C2's attempt is rejected (FORBIDDEN); the manager's succeeds, setting `response` and `responded_at` — matches the frontend's "Manager Response" labeling (`test-result/reviews-test-results.md` TC-REV-14) while also allowing the reviewed clinician to reply.

### TC-REV-API-005 — `deleteReview` is a soft delete respecting `is_deleted`
- **Priority:** Medium
- **Preconditions:** Grounded in `test-suggestion/reviews-test-suggestion.md` SUG-REV-001/003 (mock-mode fix: delete now persists to the store rather than only local React state).
- **Steps:** Call `deleteReview(id)`, then query `reviews` as the same manager.
- **Expected Result:** The review no longer appears in the standard list query; a direct database check shows `is_deleted: true`, row still present — mirrors the schema's soft-delete convention and the mock-mode fix's intent (persist, don't just filter client state).

### TC-REV-API-006 — Cross-tenant isolation: a manager cannot see or reply to another organization's reviews
- **Priority:** Critical
- **Preconditions:** Reviews exist for Clinics in Org 1 and Org 2.
- **Steps:** Log in as a manager of Org 1, query `reviews` and attempt `respondToReview` on an Org 2 review's id.
- **Expected Result:** The list query returns only Org 1's reviews (scoped through `Reviews.clinic_id → Clinics.client_org_id`); the reply attempt on Org 2's review is rejected.

### TC-REV-API-007 — `reviews` query supports the same star-filter + search the frontend already implements
- **Priority:** Medium
- **Steps:** Query `reviews(stars: 5, search: "Alice")`.
- **Expected Result:** Returns only 5-star reviews where patient or clinician name matches "Alice" — the backend contract must satisfy the combined-filter UX already proven against the mock (`TC-REV-15`), so the frontend's existing filter logic transfers unchanged.

### TC-REV-API-008 — `review_request` email is queued a fixed delay after `COMPLETE_APPOINTMENT`
- **Priority:** Medium
- **Steps:** Mark an appointment `COMPLETE_APPOINTMENT`, inspect the scheduled BullMQ jobs.
- **Expected Result:** A `review_request`-type email job is scheduled with a delay (e.g. a few hours), not sent immediately — per Phase 9's "optionally a scheduled job → `review_request` N hours after `COMPLETE_APPOINTMENT`".

### Messages

### TC-MSG-API-009 — A user can only query threads they participate in
- **Priority:** Critical
- **Preconditions:** A thread exists between Patient A and Clinician C; User D is unrelated.
- **Steps:** Log in as User D, query `messageThreads`.
- **Expected Result:** The A↔C thread is absent from D's results; attempting to fetch it by id directly also fails — matches `TC-AUTH-API-008`'s row-level scoping pattern, applied to `MessageParticipants`.

### TC-MSG-API-010 — `sendMessage` updates the thread's `last_message`/`last_activity` and increments recipients' unread counts
- **Priority:** Critical
- **Steps:** Call `sendMessage(threadId, body: "See you Tuesday")`.
- **Expected Result:** `MessageThreads.last_message` and `last_activity` update to reflect the new message; every OTHER participant's `MessageParticipants.unread_count` increments by 1 (per TC-MSG-UNIT-006); the sender's own count does not.

### TC-MSG-API-011 — `markThreadAsRead` resets only the calling user's `unread_count`
- **Priority:** High
- **Preconditions:** Grounded in `SUG-MSG-001` (mock-mode: `MockStore.markThreadAsRead(thread.id, userId)`).
- **Steps:** Call `markThreadAsRead(threadId)` as Patient A in a thread also involving Clinician C (who has their own unread messages).
- **Expected Result:** Patient A's `unread_count` resets to 0; Clinician C's `unread_count` is unaffected — this is the server-side equivalent of the mock fix, now enforced per-participant rather than per-thread.

### TC-MSG-API-012 — Cross-tenant isolation: `MessageThreads.client_org_id` prevents cross-org thread access
- **Priority:** Critical
- **Preconditions:** Two organizations, each with their own staff/patients messaging internally.
- **Steps:** Log in as a staff member of Org 1, attempt to query or send to an Org 2 thread id.
- **Expected Result:** Rejected/null — `MessageThreads.client_org_id` scoping enforced, consistent with every other tenant-owned table in the schema.

### TC-MSG-API-013 — Compose-to-existing-recipient reuses the thread server-side, matching the frontend's expectation
- **Priority:** High
- **Preconditions:** Grounded in `test-plan/messages-test-plan.md` TC-MSG-005's documented edge case.
- **Steps:** Call the compose mutation targeting a recipient who already shares a thread with the caller.
- **Expected Result:** Returns the existing `thread_id` with the new message appended to it — never a second thread for the same participant pair (server-side enforcement of `TC-MSG-UNIT-009`).

### TC-MSG-API-014 — Pagination on `messageThreads` matches the inbox list's expected shape
- **Priority:** Low
- **Steps:** Seed 30 threads for a user, query the first page.
- **Expected Result:** Returns a bounded page (e.g. 20) ordered by `last_activity` descending, with pagination metadata — most-recently-active conversations surface first, matching standard inbox UX.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### Reviews

### TC-REV-E2E-001 — Patient submits a review after a completed appointment and it appears on the clinician's public profile
- **Priority:** High
- **Steps:** As a patient with a completed appointment, submit a 5-star review with a comment via the patient-facing review flow (or the appointment-detail "Leave a review" action, once built). Then view the clinician's public `/doctor/:id` profile.
- **Expected Result:** The review appears in the platform `/reviews` moderation view and contributes to the clinician's aggregate rating shown on their public profile — end-to-end from submission through display.

### TC-REV-E2E-002 — Manager replies to a review and the patient can see the response
- **Priority:** Medium
- **Steps:** As a manager, open `/reviews`, reply to an unresponded review with "Thank you for your feedback!". As the reviewing patient, view their appointment history / the clinician's profile.
- **Expected Result:** The "Manager Response" is visible wherever the review is surfaced to the patient — the reply isn't manager-only-visible.

### TC-REV-E2E-003 — Deleting a review updates the platform-wide average rating live
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-REV-21`/`TC-REV-29` (mock-mode: average recalculates via `useMemo` on delete).
- **Steps:** As a manager, delete a 5-star review from a dataset currently averaging 4.3, confirm via the dialog.
- **Expected Result:** The Platform Average card recalculates immediately to reflect the new dataset (excluding the deleted review) and persists after a page reload — proving the deletion is server-persisted, not merely a local optimistic removal that would revert on refresh.

### Messages

### TC-MSG-E2E-004 — Composing a message to a recipient with an existing thread reuses it, end-to-end
- **Priority:** High
- **Preconditions:** Grounded in `test-plan/messages-test-plan.md` TC-MSG-005's edge case.
- **Steps:** As a staff member with an existing thread with Patient A, use the compose ("New Message") dialog, select Patient A from the grouped autocomplete, send a message.
- **Expected Result:** No second conversation row appears in the inbox — the new message lands in the SAME existing thread, visible immediately in that thread's history.

### TC-MSG-E2E-005 — Unread badge stays in sync between the sidebar nav and the Messages inbox in real time
- **Priority:** High
- **Preconditions:** Grounded in TC-MSG-006 (mock-mode: `AppShell` subscribes to the store for live count).
- **Steps:** With the Messages inbox open in one tab and the sidebar visible in another, have a second user send a new message into an existing thread.
- **Expected Result:** Both the sidebar "Messages" nav badge and the inbox's per-conversation unread dot update without a manual refresh — once wired to a real subscription, this must hold across browser tabs/sessions, not just within one mock-store instance.

### TC-MSG-E2E-006 — Mobile back-button flow works end-to-end on a real device viewport
- **Priority:** Medium
- **Preconditions:** Grounded in TC-MSG-007 (mock-mode: marked ⚠️ PARTIAL because the test browser's 614px minimum width prevented true sub-600px testing).
- **Steps:** On an actual mobile viewport (e.g. Playwright's device emulation at 375px, not just a resized desktop browser), open `/messages`, tap a conversation, tap the back arrow.
- **Expected Result:** Single-panel layout throughout (list OR thread, never both); back arrow returns cleanly to the list — this closes the gap the mock-mode QA could only source-verify, not visually confirm, due to browser tooling limits.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### Reviews

### TC-REV-FE-001 — Reviews page load shows correct stats and card count
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-REV-01` (`reviews-test-results.md`).
- **Steps:** Navigate to `/reviews`.
- **Expected Result:** "Reviews" h4, subtitle "Platform-wide patient feedback — 15 total", Platform Average card showing 4.3 with gold stars, Rating Breakdown card, 15 review cards rendered, no console errors.

### TC-REV-FE-002 — Star filter chips correctly narrow the card list
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-REV-05/06`.
- **Steps:** Click "5 ★", then "1 ★".
- **Expected Result:** "5 ★" shows 8 cards (all 5-star); "1 ★" shows 0 cards and the "No reviews found" empty state with a grey star icon.

### TC-REV-FE-003 — Search clear (×) button restores the full list
- **Priority:** Medium
- **Preconditions:** Grounded in `SUG-REV-005`/`TC-REV-10` (fixed this session).
- **Steps:** Type "John" in the search field, then click the × clear button that appears.
- **Expected Result:** × is visible only while search is non-empty; clicking it resets search to `''` and restores all 15 cards, and the × itself disappears once the field is empty again.

### TC-REV-FE-004 — Missing `created_at` renders "Date unknown", never "Invalid Date"
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-REV-002` (a real bug found and fixed this session: `new Date(undefined).toLocaleDateString()` was rendering the literal string "Invalid Date").
- **Steps:** Render a review card whose `created_at` is `undefined`.
- **Expected Result:** Shows "Date unknown" — regression guard against the exact bug that shipped and was caught in `test-result/reviews-test-results.md`.

### TC-REV-FE-005 — Delete requires confirmation and persists to the store, not just local state
- **Priority:** High
- **Preconditions:** Grounded in `SUG-REV-003`/`SUG-REV-004` — two real bugs found and fixed this session: delete originally only mutated local React state (lost on refresh) AND had no confirmation dialog at all.
- **Steps:** Click the delete icon on a review, confirm in the "Delete Review?" dialog, then reload the page.
- **Expected Result:** Dialog gates the delete (Cancel leaves the review untouched); confirming removes it from the list AND from `MockStore.reviews`, so it stays deleted after a reload — not merely filtered out of a component's `useState` array.

### TC-REV-FE-006 — Reply dialog disables submission for empty or whitespace-only text
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-REV-22/23`.
- **Steps:** Open the Reply dialog on an unresponded review, leave it empty, then type only spaces.
- **Expected Result:** "Submit Response" stays disabled in both states; typing actual content enables it.

### TC-REV-FE-007 — Editing an existing manager response reopens the dialog pre-filled
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-REV-006` (implemented this session).
- **Steps:** Click the edit icon next to an existing "Manager Response".
- **Expected Result:** Dialog reopens with the existing response text pre-filled, title/button read "Edit Response"/"Save Changes" instead of "Reply to Review"/"Submit Response".

### TC-REV-FE-008 — Pagination "Load more" only appears when more results exist beyond the current page
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-REV-007` (implemented this session — `PAGE_SIZE=10`).
- **Steps:** With 15 total reviews and no filter applied, view the initial page; click "Load more (5 remaining)".
- **Expected Result:** Initially shows 10 cards with a "Load more (5 remaining)" button; clicking it reveals all 15 and the button disappears; applying a filter that narrows results below 10 hides the button entirely.

### Messages

### TC-MSG-FE-009 — Inbox loads with role-labeled conversations and a working compose button
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MSG-001`.
- **Steps:** Navigate to `/messages`.
- **Expected Result:** ≥1 conversation shown, each with avatar initials, name, last-message preview, timestamp, and a role chip (Patient/Clinician/Staff); the teal compose (pencil) icon is visible next to the search bar.

### TC-MSG-FE-010 — Sending a message clears the input and shows a delivery tick
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MSG-003`/`SUG-MSG-006`.
- **Steps:** Open a thread, type "Hello QA test.", press Enter.
- **Expected Result:** Message renders as a right-aligned blue sent bubble with a grey single-tick delivery indicator; the input clears; the thread's `last_message` preview in the list updates to match.

### TC-MSG-FE-011 — Search has no stale-state race condition across rapid typing
- **Priority:** High
- **Preconditions:** Grounded in `BUG-MSG-004`/`SUG-MSG-004` — a real race-condition bug found and fixed this session (search previously used an inline JSX filter instead of `useMemo`, causing a stale match, e.g. "Alice Thompson," to persist incorrectly).
- **Steps:** Rapidly type and delete characters in the conversation search box several times in quick succession.
- **Expected Result:** The visible conversation list always matches the CURRENT search text — no stale result lingers from a prior keystroke. Regression guard for the specific "Alice Thompson persists" bug documented in `test-result/messages-test-results.md`.

### TC-MSG-FE-012 — Compose dialog groups recipients by role and disables Send until both fields are filled
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MSG-005`/`SUG-MSG-002`.
- **Steps:** Click the compose (pencil) icon, inspect the recipient autocomplete before selecting anyone, then select a recipient without typing a message.
- **Expected Result:** Autocomplete groups options under "Patients"/"Clinicians" headers; Send stays disabled until BOTH a recipient is selected AND the message body is non-empty.

### TC-MSG-FE-013 — Selecting a recipient who already has a thread sends there instead of creating a duplicate
- **Priority:** High
- **Preconditions:** Grounded in the documented edge case in `test-plan/messages-test-plan.md` TC-MSG-005.
- **Steps:** In the compose dialog, select a recipient who already appears in the conversation list, send a message.
- **Expected Result:** No new row appears in the conversation list — the message is appended to the existing thread, which moves to the top of the list by `last_activity`.

### TC-MSG-FE-014 — Opening an unread conversation clears its unread dot and decrements the sidebar badge
- **Priority:** High
- **Preconditions:** Grounded in `BUG-MSG-001`/`SUG-MSG-001` (fixed this session).
- **Steps:** Note the sidebar "Messages" nav badge count and the red unread dot on a specific conversation row, then click that conversation.
- **Expected Result:** The row's unread dot disappears and the sidebar badge decrements by exactly 1 — verifies `handleSelectThread` calls `MockStore.markThreadAsRead` and that `AppShell` is subscribed to the same store for a live count.

### TC-MSG-FE-015 — Empty search state renders a clear recovery message, not a blank panel
- **Priority:** Low
- **Preconditions:** Grounded in `TC-MSG-004`/`TC-MSG-008`.
- **Steps:** Type a string matching no conversation (e.g. "ZZZZNOTEXIST").
- **Expected Result:** Shows a search icon + "No conversations found" + "Try a different name or keyword" — never a blank white panel.

### TC-MSG-FE-016 — Send button is disabled for empty input; Shift+Enter inserts a newline instead of sending
- **Priority:** Medium
- **Preconditions:** Grounded in `TC-MSG-009` and the edge case noted under `TC-MSG-003`.
- **Steps:** Open a thread with an empty input box, check the Send button; then type text and press Shift+Enter.
- **Expected Result:** Send is disabled/grayed-out on empty input; Shift+Enter adds a newline within the textarea and does NOT submit the message (plain Enter does).

### TC-MSG-FE-017 — All messaging icon buttons carry accessible labels and the page is crash-resilient
- **Priority:** Low
- **Preconditions:** Grounded in `SUG-MSG-009`/`SUG-MSG-010` (both fixed this session).
- **Steps:** Inspect the DOM for compose, back-to-inbox, call, video, info, attach, and emoji buttons; separately, force a render error inside the thread view.
- **Expected Result:** Every listed button has a descriptive `aria-label` ("New message", "Back to inbox", "Start voice call", "Start video call", "Conversation info", "Attach file", "Insert emoji"); the forced render error is caught by `MessagesPageWithBoundary`'s `ErrorBoundary`, showing a fallback instead of a white screen.
