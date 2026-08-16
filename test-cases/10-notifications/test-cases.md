# Notifications — Test Cases

**Domain covers:** in-app notifications (`Notifications` model, `NotificationBell` popover + `NotificationPanel` drawer + `/notifications` full inbox page), create-on-event fan-out (appointment/payment/review triggers), GraphQL Subscription delivery, and the net-new Email Service (AWS SES, `TemplateType`, queued sends via BullMQ).
**Grounded in:** `schema.prisma` (`Notifications`, `NotificationType`, `NotificationPriority`, `EmailTemplates`, `TemplateType` enum), `context/backend-implementation-plan.md` Phase 9 (Notifications & Email Service) + Phase 10 (real-time transport), `context/frontend-contract-analysis.md §2/§6` (notification ops are local-only today, not in central `graphql/` files; subscriptions are wired on the frontend with no transport), `test-plan/notification-test-plan.md`, `test-plan/core/notifications-test-plan-done.md`, `test-result/notification-test-results.md`, `test-result/notifications-test-results.md`, `test-suggestion/notification-test-suggestion.md`, `test-suggestion/notifications-test-suggestion.md`.
**Key net-new requirement:** the Email Service (AWS SES `ap-south-1`, `nodemailer`, BullMQ-queued sends, `{{variable}}` template interpolation) has no prior QA history at all — it's written fresh against Phase 9 of the backend plan.

---

## 1. Unit Test Cases

### TC-NOTIF-UNIT-001 — Notification fan-out fires on appointment status transitions
- **Priority:** Critical
- **Steps:** Call the appointment-transition handler for `CREATE`, `CANCEL`, and `RESCHEDULE`, with a mocked `NotificationService.create`.
- **Expected Result:** Each transition calls `create()` exactly once with `type: 'appointment'` and a `title`/`message` appropriate to that transition — no double-fire, no fan-out on `COMPLETE_APPOINTMENT`'s internal no-op sub-steps.

### TC-NOTIF-UNIT-002 — Notification fan-out fires on payment received
- **Priority:** High
- **Steps:** Call the payment-confirmation handler with a mocked `NotificationService.create`.
- **Expected Result:** Creates a notification with `type: 'payment'`, `priority: 'medium'` (or higher if configured), referencing the correct patient/manager recipient — not fired for a payment that fails signature verification (ties to `TC-BILL-API-002`).

### TC-NOTIF-UNIT-003 — `iconColor()`/priority-vs-type resolution: priority intentionally overrides type
- **Priority:** Medium
- **Preconditions:** Grounded in `test-suggestion/notifications-test-suggestion.md` SUG-NOTIF-007 (documented, not changed, this session — the behavior is intentional).
- **Steps:** Call the icon-styling resolver with `(priority: 'high', type: 'appointment')`.
- **Expected Result:** Returns the high-priority red styling (`{bg: '#FEE2E2', color: '#DC2626'}`), NOT the appointment-blue styling — confirms severity always wins over category so a high-priority item is scannable regardless of type. A regression here (type winning instead) must fail this test.

### TC-NOTIF-UNIT-004 — `timeAgo()` boundary values are exact, not off-by-one
- **Priority:** Medium
- **Preconditions:** Grounded in `test-suggestion/notifications-test-suggestion.md` SUG-NOTIF-PLAN-004.
- **Steps:** Call `timeAgo()` with timestamps at 30 seconds, 59 minutes, 60 minutes, 23h59m, and 24h00m ago.
- **Expected Result:** Returns `"just now"`, `"59m ago"`, `"1h ago"`, `"23h ago"`, `"1d ago"` respectively — the minute/hour/day boundaries must not round the wrong direction at exactly 60/24.

### TC-NOTIF-UNIT-005 — `timeAgo()` returns empty string for a missing/null timestamp, never "Invalid Date"
- **Priority:** Low
- **Steps:** Call `timeAgo(null)` and `timeAgo(undefined)`.
- **Expected Result:** Both return `''` — guards the same class of bug found and fixed in Reviews (`SUG-REV-002`'s `created_at` null-guard), applied proactively here.

### TC-NOTIF-UNIT-006 — Email template interpolation replaces all `{{variable}}` placeholders
- **Priority:** Critical
- **Preconditions:** An `EmailTemplates` row with `subject: "Your appointment with {{clinician_name}}"`, `body: "Hi {{patient_name}}, see you on {{appointment_date}}."`.
- **Steps:** Call `EmailService.render(template, {clinician_name: "Dr. Rao", patient_name: "Asha", appointment_date: "12 Apr"})`.
- **Expected Result:** All three placeholders are substituted; no `{{...}}` tokens remain in the rendered subject/body.

### TC-NOTIF-UNIT-007 — Email template interpolation fails loudly on a missing variable, not silently
- **Priority:** High
- **Preconditions:** Template references `{{clinician_name}}` but the caller's variables object omits it.
- **Steps:** Call `EmailService.render(template, {patient_name: "Asha"})`.
- **Expected Result:** Either throws a clear "missing template variable: clinician_name" error, or substitutes a documented fallback — must NOT silently send an email to a patient reading "Your appointment with {{clinician_name}}".

### TC-NOTIF-UNIT-008 — `TemplateType` enum covers every call site the backend plan requires
- **Priority:** High
- **Steps:** Enumerate `TemplateType` values in `schema.prisma` and diff against the call sites listed in Phase 9 (`confirmation`, `reschedule`, `cancellation`, `welcome`, `password_reset`, `otp`, `invoice_receipt`, `review_request`).
- **Expected Result:** Exact match, no call site references a `TemplateType` value that doesn't exist in the enum — this is a compile-time-checkable guarantee once the NestJS `EmailService.send(templateType, ...)` signature is typed against the enum.

### TC-NOTIF-UNIT-009 — Notification priority defaults to `medium` when unspecified
- **Priority:** Low
- **Steps:** Construct a `Notifications` create-input without a `priority` field.
- **Expected Result:** Defaults to `"medium"` — matches `schema.prisma`'s `NotificationPriority @default(medium)`.

### TC-NOTIF-UNIT-010 — BullMQ email job payload is queued, not sent inline
- **Priority:** High
- **Steps:** Call `EmailService.send('welcome', user.email, vars)` with a mocked BullMQ queue.
- **Expected Result:** A job is added to the email queue with the template type + recipient + variables as payload; the function returns before any actual SES call happens — guards Phase 9's explicit requirement that a slow SES call must never block a GraphQL mutation's response.

### TC-NOTIF-UNIT-011 — `hasUnread` derivation matches "any notification with `is_read: false`"
- **Priority:** Medium
- **Steps:** Compute `hasUnread` for a notification list with 0 unread, then with 1 unread, then with all read again after a mark-all-read.
- **Expected Result:** `false`, `true`, `false` respectively — governs whether the "Mark All Read" button renders at all (`TC-NOTIF-13` in `notification-test-plan.md`).

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-NOTIF-API-001 — `notifications` query returns only the calling user's own notifications
- **Priority:** Critical
- **Preconditions:** User A and User B each have notifications.
- **Steps:** Log in as User A, query `notifications`.
- **Expected Result:** Returns only User A's rows — `Notifications.user_id` scoped from the JWT, never from a client-supplied argument, mirroring `TC-AUTH-API-005`'s pattern for `me`.

### TC-NOTIF-API-002 — `notifications(filter: unread)` vs `notifications(filter: all)` return correct subsets
- **Priority:** High
- **Preconditions:** Grounded in `test-plan/core/notifications-test-plan-done.md` TC-NOTIF-02/03/04.
- **Steps:** Query with `filter: unread`, then `filter: all`.
- **Expected Result:** `unread` returns only `is_read: false` rows; `all` returns every row for that user, including read ones — matches the exact two-filter contract the frontend page already assumes.

### TC-NOTIF-API-003 — `markNotificationRead` rejects marking another user's notification
- **Priority:** Critical
- **Preconditions:** A notification belongs to User B.
- **Steps:** Log in as User A, call `markNotificationRead(id: <UserB's notification id>)`.
- **Expected Result:** Rejected (FORBIDDEN or not-found) — verify via a subsequent query as User B that their notification's `is_read` is still `false`. This is the notifications-domain equivalent of `TC-AUTH-API-008`'s row-level scoping test, and the frontend currently has zero client-side enforcement of it.

### TC-NOTIF-API-004 — `markAllNotificationsRead` only affects the calling user's rows
- **Priority:** Critical
- **Preconditions:** User A has 3 unread, User B has 2 unread.
- **Steps:** Log in as User A, call `markAllNotificationsRead`.
- **Expected Result:** User A's 3 become read; User B's 2 remain unread — a naive `UPDATE notifications SET is_read=true` without a `WHERE user_id = ?` clause would fail this test.

### TC-NOTIF-API-005 — `deleteNotification` is a soft delete, not a hard delete
- **Priority:** Medium
- **Steps:** Call `deleteNotification(id)`, then inspect the row directly (bypassing the resolver, e.g. via a test-only query).
- **Expected Result:** Row still exists in the database with `is_deleted: true`; the standard `notifications` query excludes it. Matches the `is_deleted` soft-delete pattern used consistently across `schema.prisma`.

### TC-NOTIF-API-006 — Notification created on appointment cancellation is delivered via GraphQL Subscription in real time
- **Priority:** Critical
- **Preconditions:** Client subscribed to the relevant subscription channel for the affected user.
- **Steps:** Cancel an appointment via `CANCEL_APPOINTMENT` while a subscription client is connected.
- **Expected Result:** The subscription pushes the new notification payload within a short bound (e.g. <2s) without the client polling — this is the transport gap flagged in `frontend-contract-analysis.md §6` (`apollo/client.js` never configures a `wsLink`/`split()`); this test only passes once Phase 10's `graphql-ws` + Redis pub/sub transport exists.

### TC-NOTIF-API-007 — Notification subscription scales across two backend worker instances via Redis pub/sub
- **Priority:** High
- **Preconditions:** Two backend instances running behind a load balancer, both connected to the same Redis.
- **Steps:** Client A's WebSocket connection lands on instance 1; the triggering mutation (e.g. `CREATE_APPOINTMENT`) is routed to instance 2.
- **Expected Result:** Client A still receives the push — proves the pub/sub fan-out crosses instances via Redis (`graphql-redis-subscriptions`) rather than only working when subscriber and publisher happen to share a process.

### TC-NOTIF-API-008 — `EmailService.send` renders the correct `EmailTemplates` row by `template_type`
- **Priority:** Critical
- **Preconditions:** Two active `EmailTemplates` rows exist for `template_type: confirmation` and `template_type: cancellation`.
- **Steps:** Call `EmailService.send('cancellation', to, vars)`.
- **Expected Result:** Sends using the `cancellation` template's subject/body, never the `confirmation` one — verify by inspecting the queued job payload or a test SES sink.

### TC-NOTIF-API-009 — Welcome email is queued on registration; password-reset email is queued on forgot-password
- **Priority:** High
- **Steps:** Register a new account; separately, trigger forgot-password for an existing account.
- **Expected Result:** A `welcome`-type email job is queued for the new account; a `password_reset`-type job is queued for the existing account, each with the correct recipient — these are the Auth-module call sites Phase 9 requires wiring.

### TC-NOTIF-API-010 — `invoice_receipt` email is queued only after a successful payment, never on a failed one
- **Priority:** High
- **Steps:** Complete a payment successfully; separately, attempt a payment that fails Razorpay signature verification.
- **Expected Result:** Successful payment queues an `invoice_receipt` email job; the failed attempt queues none — ties to `TC-BILL-API-002`'s guarantee that no transaction is persisted on signature failure.

### TC-NOTIF-API-011 — Default email templates are seeded for every `TemplateType`, app usable without manual authoring
- **Priority:** Medium
- **Steps:** Run `prisma/seed.ts` against a fresh test database, then query `EmailTemplates`.
- **Expected Result:** At least one active row exists for each of the 8 `TemplateType` values — per Phase 9's requirement that the app be usable immediately, with the admin `EmailTemplates` CRUD screen only needed for later edits, not first-run setup.

### TC-NOTIF-API-012 — A `patient`-role token cannot query another patient's notifications by manipulating the `user_id` in a raw query
- **Priority:** Critical
- **Steps:** Log in as Patient A, attempt any notifications-related query/mutation that accepts a `userId` argument (if one exists) set to Patient B's id.
- **Expected Result:** Rejected, or the argument is ignored in favor of the JWT's own `sub` — no such argument should exist at all for `notifications`/`markNotificationRead`, matching the `me` query's design in `TC-AUTH-API-005`.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-NOTIF-E2E-001 — Booking an appointment produces a real-time bell notification without a page refresh
- **Priority:** Critical
- **Steps:** As Patient A (logged in, bell visible), have a manager (in a second browser context) create an appointment for Patient A.
- **Expected Result:** Patient A's bell badge count increments live via the subscription (TC-NOTIF-API-006), without any manual refresh or the existing 30s poll interval being the only mechanism.

### TC-NOTIF-E2E-002 — Cancelling an appointment sends both an in-app notification and a real email
- **Priority:** Critical
- **Steps:** Cancel a confirmed appointment; check the patient's bell/inbox and a test email sink (not a real carrier).
- **Expected Result:** An in-app notification with `type: 'appointment'` appears, and a `cancellation`-template email arrives at the patient's address with the correct appointment details interpolated — both channels fire from the same cancellation event.

### TC-NOTIF-E2E-003 — Clicking a notification with an action navigates and marks it read in one step
- **Priority:** High
- **Preconditions:** Grounded in `test-plan/notification-test-plan.md` TC-NOTIF-013.
- **Steps:** Open the NotificationPanel drawer, click an unread "New Appointment Booked" notification.
- **Expected Result:** Navigates to `/appointments` (or the relevant `action_url`), the panel closes, and the notification is marked read server-side — reload the page and confirm it stays read (not just a local optimistic flip that reverts).

### TC-NOTIF-E2E-004 — Bell popover and the full `/notifications` page show consistent data
- **Priority:** Critical
- **Preconditions:** Grounded in `test-result/notifications-test-results.md` OBS-1 — a real bug found where the topbar bell showed a badge of "3" while the `/notifications` page showed an empty inbox, because the two components read from different data sources (MockStore vs GraphQL).
- **Steps:** With a real backend running, note the bell's unread badge count, then navigate to `/notifications` and count the unread rows there.
- **Expected Result:** The two counts match exactly. This regression test exists specifically because the divergence was already caught once in mock mode (`test-suggestion/notifications-test-suggestion.md` SUG-NOTIF-001/SUG-NOTIF-PLAN-002) — once both surfaces are wired to the same backend query, this must not recur.

### TC-NOTIF-E2E-005 — Marking all read on the full page updates the bell badge without a manual refresh
- **Priority:** High
- **Steps:** With several unread notifications, click "Mark All Read" on `/notifications`, then check the AppBar bell.
- **Expected Result:** Bell badge drops to 0 (or disappears) shortly after, live — either via the subscription channel or the bell's own poll picking up the change quickly, not requiring a full page reload.

### TC-NOTIF-E2E-006 — Deleting a notification requires confirmation and is permanent
- **Priority:** High
- **Preconditions:** Grounded in `test-suggestion/notifications-test-suggestion.md` SUG-NOTIF-002 (already implemented in mock mode: a confirmation dialog now gates the delete).
- **Steps:** Click delete on a notification, confirm in the dialog.
- **Expected Result:** Notification is removed from the list; reloading the page confirms it does not reappear (soft-deleted server-side per TC-NOTIF-API-005) — verifies the mock-mode UX fix carries through to the real backend, not just the local dialog behavior.

### TC-NOTIF-E2E-007 — A logged-out user hitting `/notifications` never fires the notifications query
- **Priority:** Medium
- **Preconditions:** Grounded in `test-suggestion/notifications-test-suggestion.md` SUG-NOTIF-003 (already fixed in mock mode with `skip: !user?.id`).
- **Steps:** Simulate an expired session mid-session (token cleared), observe network requests.
- **Expected Result:** No `GET_NOTIFICATIONS` request fires while `user` is falsy — the guard added in mock mode must be preserved once wired to the live backend, not lost during the rewiring.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### TC-NOTIF-FE-001 — Bell badge shows the correct unread count and caps at "9+"
- **Priority:** Medium
- **Preconditions:** Grounded in `test-plan/notification-test-plan.md` TC-NOTIF-001 and edge case E5.
- **Steps:** Observe the bell badge with the default mock (3 unread), then with a mock dataset of 12 unread.
- **Expected Result:** Shows `3` in the default case; shows `9+` (via `max={9}`) in the 12-unread case — the badge must never render a literal `12`.

### TC-NOTIF-FE-002 — Clicking a notification in the bell popover marks it read and decrements the badge
- **Priority:** High
- **Preconditions:** Grounded in TC-NOTIF-004 in `notification-test-plan.md`.
- **Steps:** Open the bell popover, click an unread item.
- **Expected Result:** That item's bold styling and unread dot clear immediately; the badge count decrements by exactly 1.

### TC-NOTIF-FE-003 — "View All Notifications" navigates to the full inbox and closes the popover
- **Priority:** Medium
- **Preconditions:** Grounded in `BUG-NOTIF-002` (found and fixed this session — button previously had no `onClick` at all).
- **Steps:** Open the bell popover, click "View All Notifications".
- **Expected Result:** Popover closes and the app navigates to `/notifications` — regression guard against this specific button silently doing nothing again.

### TC-NOTIF-FE-004 — NotificationPanel renders as a right-side drawer on desktop, bottom sheet on mobile
- **Priority:** Medium
- **Preconditions:** Grounded in TC-NOTIF-008/009.
- **Steps:** Open the panel at ≥600px viewport width, then at <600px.
- **Expected Result:** Desktop: slides from the right, 380px wide, full height. Mobile: slides from the bottom, max-height 78vh, rounded top corners, visible drag-handle bar.

### TC-NOTIF-FE-005 — Unread/All filter tabs in the panel correctly narrow the list
- **Priority:** Medium
- **Preconditions:** Grounded in TC-NOTIF-011/012.
- **Steps:** Click "Unread (3)", then click "All".
- **Expected Result:** Unread tab shows exactly 3 items with the chip visually selected; All tab restores all 7 mock items.

### TC-NOTIF-FE-006 — Dismiss and inline "Mark as read" buttons stop click propagation
- **Priority:** High
- **Preconditions:** Grounded in TC-NOTIF-014/015 — these buttons sit inside a clickable list-item row that itself navigates on click.
- **Steps:** Click the inline dismiss (×) button on a notification, then the inline "Mark as read" button on another.
- **Expected Result:** Neither click triggers the row's own navigate-on-click handler — dismiss removes the item and decrements the total count; mark-as-read clears the unread styling — both without any navigation occurring.

### TC-NOTIF-FE-007 — Empty state ("All caught up!") shows only on the Unread tab, never on All
- **Priority:** Medium
- **Preconditions:** Grounded in TC-NOTIF-017 and edge case E1 (`notification-test-plan.md`).
- **Steps:** Mark every notification read, then view the Unread tab; separately, dismiss every notification and view the All tab.
- **Expected Result:** Unread tab with zero unread shows `DoneAllRoundedIcon` + "All caught up!" + "No unread notifications". All tab with zero remaining items shows a plain empty list, NOT the "All caught up!" copy — the two empty states must not be conflated.

### TC-NOTIF-FE-008 — All interactive buttons on NotificationPanel carry accessible labels
- **Priority:** Low
- **Preconditions:** Grounded in `BUG-NOTIF-001` (found and fixed this session).
- **Steps:** Inspect the DOM for close, mark-all, per-item dismiss, and per-item mark-read buttons.
- **Expected Result:** `aria-label="Close notifications panel"`, `aria-label="Mark all notifications as read"`, `aria-label="Dismiss: {title}"`, `aria-label="Mark as read: {title}"` — all present, none relying solely on a Tooltip for accessible naming.

### TC-NOTIF-FE-009 — NotificationPanel is wrapped in an ErrorBoundary
- **Priority:** Low
- **Preconditions:** Grounded in `BUG-NOTIF-003`.
- **Steps:** Force a render error inside the panel's list (e.g. malformed mock data), observe behavior.
- **Expected Result:** The `ErrorBoundary` catches it and shows a fallback UI, not a white-screened app — verify the default export is `NotificationPanelWithBoundary`.

### TC-NOTIF-FE-010 — `/notifications` page shows a spinner before data resolves, then the correct filter default
- **Priority:** Medium
- **Preconditions:** Grounded in TC-NOTIF-01/02 in `notifications-test-plan-done.md`.
- **Steps:** Navigate to `/notifications` and observe the very first render frame, then the settled state.
- **Expected Result:** A centered `CircularProgress` shows briefly; once resolved, "Unread" is the active filter chip by default (bold, boxShadow, primary color) — matches `useState('unread')`.

### TC-NOTIF-FE-011 — Delete requires confirmation via a dialog, not an instant destructive action
- **Priority:** High
- **Preconditions:** Grounded in SUG-NOTIF-002 (fixed this session — previously fired `DELETE_NOTIF` with zero confirmation).
- **Steps:** Click the delete icon on any notification card on `/notifications`.
- **Expected Result:** A confirmation dialog ("Delete Notification?") opens with Cancel/Delete actions; the mutation only fires after explicit "Delete" confirmation — clicking Cancel leaves the notification untouched.

### TC-NOTIF-FE-012 — Concurrent action buttons are disabled while a mutation is in flight
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-NOTIF-004 (race-condition fix — `pendingId` guard added this session).
- **Steps:** Trigger a delete action, then immediately attempt to click mark-read on a different card before the first resolves.
- **Expected Result:** The second action is blocked (button `disabled={!!pendingId}`) until the first completes — no two mutations fire concurrently from this page.

### TC-NOTIF-FE-013 — "Mark All Read" shows a loading state during the mutation
- **Priority:** Low
- **Preconditions:** Grounded in SUG-NOTIF-005.
- **Steps:** Click "Mark All Read" with a simulated slow network.
- **Expected Result:** Button shows a `CircularProgress` + "Marking..." label and is disabled for the duration of the mutation, preventing a double-click from firing it twice.

### TC-NOTIF-FE-014 — Filter chip labels display live unread/all counts
- **Priority:** Low
- **Preconditions:** Grounded in SUG-NOTIF-006.
- **Steps:** View the Unread/All toggle with 4 unread notifications present.
- **Expected Result:** Buttons render "Unread (4)" / "All (7)" (or equivalent), not bare "Unread"/"All" labels with no count context.
