# Authentication & Authorization — Test Cases

**Domain covers:** login, registration, OTP passwordless login, forgot-password, JWT issuance/refresh, RBAC guards (role + row-level), session storage, inactivity auto-logout.
**Grounded in:** `context/frontend-contract-analysis.md §3, §8`, `schema.prisma` (`Users`, `UserProfiles`, `Roles`/implied via `roles[]`, `Permissions`, `RolePermissions`, `UserRoles`), `context/backend-implementation-plan.md` Phase 3.
**Roles in system:** `admin`, `super_admin`, `manager`, `clinician`, `staff`, `patient` (an admin user typically carries both `admin` and `super_admin`).

---

## 1. Unit Test Cases

### TC-AUTH-UNIT-001 — Password hash verification accepts correct password
- **Priority:** Critical
- **Preconditions:** A user record exists with a bcrypt hash of `"Test1234!"`.
- **Steps:** Call the auth service's `verifyPassword("Test1234!", storedHash)`.
- **Expected Result:** Returns `true`.

### TC-AUTH-UNIT-002 — Password hash verification rejects incorrect password
- **Priority:** Critical
- **Steps:** Call `verifyPassword("WrongPassword", storedHash)`.
- **Expected Result:** Returns `false`. No exception thrown, no timing shortcut (constant-time compare).

### TC-AUTH-UNIT-003 — JWT payload contains required claims
- **Priority:** Critical
- **Steps:** Call the token-signing function with a user object `{id, email, roles: ['clinician']}`.
- **Expected Result:** Decoded JWT payload contains `sub` (user id), `roles`, `client_org_id` (tenant scope), `iat`, `exp`. Missing `client_org_id` must fail this test — it's the field row-level scoping depends on.

### TC-AUTH-UNIT-004 — JWT expiry matches configured TTL
- **Priority:** High
- **Steps:** Sign a token with access-token TTL configured to 900s (15 min). Decode and compute `exp - iat`.
- **Expected Result:** Equals 900 (± 1s tolerance).

### TC-AUTH-UNIT-005 — Refresh token rotation invalidates the old token
- **Priority:** Critical
- **Preconditions:** A valid refresh token R1 exists for a user.
- **Steps:** Call `refresh(R1)`, obtaining new tokens (A2, R2). Then call `refresh(R1)` again.
- **Expected Result:** First call succeeds. Second call (reusing R1) is rejected — proves rotation, not just expiry-based invalidation. This guards against replay if a refresh token is ever leaked.

### TC-AUTH-UNIT-006 — `hasRole` logic matches on any of multiple required roles
- **Priority:** High
- **Steps:** Given `user.roles = ['manager']`, call `hasRole(user, ['admin', 'super_admin', 'manager'])`.
- **Expected Result:** Returns `true` (OR semantics, matching the frontend's `RoleGuard` allow-list behavior).

### TC-AUTH-UNIT-007 — OTP generation produces a 6-digit numeric code with expiry
- **Priority:** High
- **Steps:** Call `generateOtp(phone)`.
- **Expected Result:** Returns a 6-digit string (`000000`–`999999`, zero-padded), stored server-side (Redis) with a 5-minute TTL, never returned in the API response body (only sent via SMS provider).

### TC-AUTH-UNIT-008 — OTP verification fails after 3 incorrect attempts
- **Priority:** Critical
- **Preconditions:** An OTP was generated for a phone number.
- **Steps:** Call `verifyOtp(phone, wrongCode)` three times, then call with the correct code.
- **Expected Result:** The 4th call (even with the correct code) is rejected — the OTP is invalidated after 3 failed attempts, forcing a new OTP request. Prevents brute-forcing a 6-digit space over a live OTP window.

### TC-AUTH-UNIT-009 — Email validation rejects malformed addresses
- **Priority:** Medium
- **Steps:** Validate `"not-an-email"`, `"a@b"`, `"valid@example.com"`.
- **Expected Result:** First two rejected, third accepted.

### TC-AUTH-UNIT-010 — Password strength validator enforces minimum policy
- **Priority:** High
- **Steps:** Validate `"short"`, `"alllowercase123"`, `"Valid123!"`.
- **Expected Result:** First two rejected (min 8 chars + mixed case + digit, matching the frontend's existing password-strength meter intent), third accepted.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-AUTH-API-001 — `login` mutation returns the exact contract shape the frontend expects
- **Priority:** Critical
- **Preconditions:** A seeded user `admin@medibook.dev` / `Admin1234!` exists with role `admin`.
- **Steps:** Send `login(email: "admin@medibook.dev", password: "Admin1234!")`.
- **Expected Result:** Response is `{access_token, token_type: "Bearer", expires_in, user: {id, email, roles: [{name}], clinician}}` — field names must match exactly what `AuthContext.jsx` destructures (`frontend-contract-analysis.md §3`), or the frontend silently breaks despite a "successful" API response.

### TC-AUTH-API-002 — `login` with wrong password returns a generic error
- **Priority:** Critical
- **Steps:** Send `login` with a valid email but wrong password.
- **Expected Result:** GraphQL error / userError with a generic message ("Invalid credentials") — must NOT reveal whether the email exists (prevents user enumeration).

### TC-AUTH-API-003 — `login` with a non-existent email returns the same generic error
- **Priority:** Critical
- **Steps:** Send `login` with an email not in the system.
- **Expected Result:** Identical error shape/message/timing profile to TC-AUTH-API-002 — verify no timing side-channel (e.g., skipping the bcrypt compare when the user doesn't exist) that would let an attacker enumerate valid emails.

### TC-AUTH-API-004 — `me` query requires a valid Authorization header
- **Priority:** Critical
- **Steps:** Send `me` with no `Authorization` header; then with an expired token; then with a tampered/invalid-signature token.
- **Expected Result:** All three rejected with 401/UNAUTHENTICATED. None return partial user data.

### TC-AUTH-API-005 — `me` returns only the calling user's own data
- **Priority:** Critical
- **Steps:** Log in as User A, call `me`.
- **Expected Result:** Returned `id` matches User A's id — not derived from any client-supplied parameter (there should be no `userId` argument on `me` at all; it must come only from the JWT).

### TC-AUTH-API-006 — `logout` invalidates the refresh token server-side
- **Priority:** High
- **Steps:** Log in, capture the refresh token, call `logout`, then attempt `refresh` with the captured token.
- **Expected Result:** The `refresh` call after logout is rejected — logout isn't purely a frontend `clearStore()` no-op.

### TC-AUTH-API-007 — Role guard blocks a `patient`-role token from an admin-only mutation
- **Priority:** Critical
- **Steps:** Log in as a `patient`, call `createUser` (admin-only mutation).
- **Expected Result:** Rejected with FORBIDDEN, before any database write occurs (verify via a subsequent count query that no row was inserted).

### TC-AUTH-API-008 — Row-level scoping: a patient cannot fetch another patient's record by ID
- **Priority:** Critical
- **Preconditions:** Patient A and Patient B both exist.
- **Steps:** Log in as Patient A, query `patient(id: <PatientB.id>)`.
- **Expected Result:** Rejected or returns null — NOT Patient B's data. This is the single most important test in the whole suite: the frontend has zero client-side enforcement of this (`frontend-contract-analysis.md §3/§8`), so the backend is the only line of defense.

### TC-AUTH-API-009 — Row-level scoping: a clinician cannot fetch a patient who isn't theirs
- **Priority:** Critical
- **Preconditions:** Clinician C1 has an appointment history with Patient A but none with Patient B.
- **Steps:** Log in as C1, query `patient(id: <PatientB.id>)`.
- **Expected Result:** Rejected or returns null.

### TC-AUTH-API-010 — Cross-tenant isolation: a user from Org 1 cannot query Org 2's data
- **Priority:** Critical
- **Preconditions:** Two separate `ClientOrganizations` exist, each with their own clinics/patients.
- **Steps:** Log in as a manager of Org 1, query `clinics` (list) and `patient(id: <Org2Patient.id>)`.
- **Expected Result:** The `clinics` list contains only Org 1's clinics; the direct `patient` lookup for an Org 2 patient returns null/forbidden. This is the multi-tenancy guarantee the whole SaaS model depends on.

### TC-AUTH-API-011 — OTP login: requesting an OTP for an unregistered phone doesn't leak account existence
- **Priority:** Medium
- **Steps:** Request OTP for a phone number with no account, and for one with an account.
- **Expected Result:** Both return the same generic "OTP sent if applicable" response shape — matches TC-AUTH-API-002/003's enumeration-prevention principle, just for the OTP channel (MSG91/Gupshup, `context/backend-implementation-plan.md` India table).

### TC-AUTH-API-012 — Rate limiting on `login` mutation
- **Priority:** High
- **Steps:** Send 10 rapid `login` attempts with wrong passwords from the same IP within 1 minute.
- **Expected Result:** Requests beyond a configured threshold (e.g., 5/min) are rejected with a rate-limit error, independent of the account-lockout logic in TC-AUTH-API-013 — this protects against distributed guessing across many accounts, not just one.

### TC-AUTH-API-013 — Account lockout after repeated failed logins on one account
- **Priority:** High
- **Steps:** Attempt `login` with the correct email and wrong password 5 times for the same account, then attempt with the correct password.
- **Expected Result:** The 6th attempt (even with correct password) is rejected with an account-locked message; a real, server-enforced version of the lockout the frontend currently only fakes client-side (`frontend-contract-analysis.md §3`).

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-AUTH-E2E-001 — Standard login redirects to the correct role-based landing page
- **Priority:** Critical
- **Steps:** For each role (`admin`, `manager`, `clinician`, `staff`, `patient`): log in with that role's seeded credentials via the login form.
- **Expected Result:** Lands on `/dashboard` (admin/super_admin), `/manager/dashboard`, `/clinician/dashboard`, `/staff/dashboard`, `/patient/dashboard` respectively — matches `AuthContext.getPostLoginRedirect()` exactly.

### TC-AUTH-E2E-002 — Invalid credentials show an inline error, no navigation
- **Priority:** High
- **Steps:** Submit the login form with a wrong password.
- **Expected Result:** Stays on `/login`, shows an inline error message, form remains filled with the entered email (not cleared).

### TC-AUTH-E2E-003 — "Remember me" persists session across browser restart; unchecked does not
- **Priority:** Medium
- **Steps:** (a) Log in with "Remember me" checked, close and reopen the browser context, reload the app. (b) Repeat with it unchecked.
- **Expected Result:** (a) still authenticated (token in `localStorage`). (b) not authenticated (token was only in `sessionStorage`, cleared on browser close).

### TC-AUTH-E2E-004 — Direct navigation to a protected route while logged out redirects to login
- **Priority:** High
- **Steps:** While logged out, navigate directly to `/dashboard`.
- **Expected Result:** Redirected to `/login`; after successful login, lands on the originally requested page (not just the default dashboard) — verify this specific redirect-back behavior since it's easy to regress.

### TC-AUTH-E2E-005 — A `patient` role hitting `/admin/users` sees the 403 page, not the admin UI
- **Priority:** Critical
- **Steps:** Log in as a patient, navigate directly to `/admin/users`.
- **Expected Result:** Renders `Forbidden403`, never renders the admin users table even momentarily (check for a flash-of-protected-content by asserting the admin table never mounts, not just that it's eventually replaced).

### TC-AUTH-E2E-006 — Inactivity auto-logout warns then logs out
- **Priority:** Medium
- **Steps:** Log in, then simulate 14 minutes of no mouse/keyboard/scroll activity (fast-forward timers rather than real-time wait in the test).
- **Expected Result:** A warning appears at the 14-minute mark with a 60-second countdown (`useInactivityLogout`); if no interaction occurs, the user is logged out and redirected to `/login` at 15 minutes total.

### TC-AUTH-E2E-007 — OTP login end-to-end
- **Priority:** High
- **Steps:** Choose "Sign in with OTP", enter a registered phone number, receive the OTP (via a test SMS sink, not a real carrier), enter it.
- **Expected Result:** Logs in successfully and redirects per role, exactly like password login — this is currently a pure `setTimeout` simulation (`frontend-contract-analysis.md §3`) and must become a real round trip.

### TC-AUTH-E2E-008 — Registration creates a real account usable for subsequent login
- **Priority:** High
- **Steps:** Complete the Register tab with a new email/password, then log out, then log in with those same credentials.
- **Expected Result:** Login succeeds — proves Registration actually persisted an account server-side, closing the gap where it currently "never calls a mutation at all" (`frontend-contract-analysis.md §3`).

### TC-AUTH-E2E-009 — Forgot-password round trip
- **Priority:** Medium
- **Steps:** Request a password reset for a real account, retrieve the reset link/token from the test email sink, set a new password, log in with the new password.
- **Expected Result:** Succeeds; the old password no longer works.

### TC-AUTH-E2E-010 — Logout clears session and blocks back-navigation into protected pages
- **Priority:** Medium
- **Steps:** Log in, navigate to `/dashboard`, log out, then press the browser Back button.
- **Expected Result:** Redirected to `/login`, not shown a stale cached view of the dashboard.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass today, independent of backend readiness.*

### TC-AUTH-FE-001 — Demo account buttons pre-fill credentials without submitting
- **Priority:** Medium
- **Steps:** Click each of the 5 demo-account buttons (Admin, Manager, Clinician, Staff, Patient) in turn.
- **Expected Result:** Each click fills the email/password fields with that role's mock credentials and does NOT auto-submit — the user must still click "Sign In" (verified behavior as of this session).

### TC-AUTH-FE-002 — Password field visibility toggle
- **Priority:** Low
- **Steps:** Type a password, click the eye icon.
- **Expected Result:** Input type toggles between `password` and `text`.

### TC-AUTH-FE-003 — CapsLock warning appears when typing password with CapsLock on
- **Priority:** Low
- **Steps:** Simulate CapsLock-on keydown while the password field is focused.
- **Expected Result:** A CapsLock warning message renders near the field.

### TC-AUTH-FE-004 — Password strength meter updates live while typing (Register tab)
- **Priority:** Low
- **Steps:** Type progressively stronger passwords into the Register tab's password field.
- **Expected Result:** Strength indicator updates in real time (weak → medium → strong) without requiring blur/submit.

### TC-AUTH-FE-005 — Client-side lockout after 5 failed mock-mode attempts
- **Priority:** Medium
- **Steps:** In mock mode (no backend), submit wrong credentials 5 times against a demo account.
- **Expected Result:** Form disables further submission with a lockout message — this is today's client-only approximation of TC-AUTH-API-013; once the backend exists, this test should be re-verified to confirm the frontend surfaces the server's lockout response rather than only its own local counter.

### TC-AUTH-FE-006 — RoleGuard renders children for an allowed role, Forbidden403 otherwise
- **Priority:** High
- **Steps:** Render a route wrapped in `RoleGuard(['admin','manager'])` with a mock-authenticated user whose role is (a) `manager`, (b) `patient`.
- **Expected Result:** (a) renders the wrapped children. (b) renders `Forbidden403`.

### TC-AUTH-FE-007 — ProtectedRoute shows a loading state before redirecting, not an instant redirect
- **Priority:** Low
- **Steps:** Mount `ProtectedRoute` while `AuthContext`'s `isLoading` is true.
- **Expected Result:** Renders a loading indicator, not an immediate redirect to `/login` (avoids a flash-redirect for users who are actually authenticated but whose auth check hasn't resolved yet).

### TC-AUTH-FE-008 — Mobile signup flow validates a phone number format before "sending" OTP
- **Priority:** Medium
- **Steps:** Enter an invalid phone number in the Mobile Signup mode, click send.
- **Expected Result:** Inline validation error, no OTP-sent state triggered.

### TC-AUTH-FE-009 — Forgot-password cooldown timer disables resend for 60 seconds
- **Priority:** Low
- **Steps:** Submit a forgot-password request, observe the resend button.
- **Expected Result:** Resend is disabled with a visible countdown from 60s, matching current simulated behavior — this UX should be preserved once wired to a real mutation.

### TC-AUTH-FE-010 — Session storage vs local storage selection persists correctly in mock mode
- **Priority:** Medium
- **Steps:** Log in via mock mode with "Remember me" unchecked, inspect browser storage.
- **Expected Result:** Token/user present in `sessionStorage`, absent from `localStorage`.

### TC-AUTH-FE-011 — Session-expired banner shown via `?reason=session_expired`
- **Priority:** Medium
- **Preconditions:** Grounded in `test-suggestion/auth-test-suggestion.md` NEW-AUTH-006 (already implemented).
- **Steps:** Navigate directly to `/login?reason=session_expired`.
- **Expected Result:** A dismissable amber warning alert renders above the login card: "Your session expired due to inactivity. Please sign in again." Verify `useInactivityLogout` actually navigates to this exact URL on expiry (don't just test the banner in isolation — confirm the two are wired together, per `auth-test-results.md` TC-AUTH-033).

### TC-AUTH-FE-012 — "Last signed in" timestamp renders in the sidebar after login
- **Priority:** Low
- **Preconditions:** Grounded in `test-suggestion/auth-test-suggestion.md` SUG-AUTH-008/NEW-AUTH-001.
- **Steps:** Log in, inspect the sidebar footer immediately, then reload after a few minutes.
- **Expected Result:** Shows "Just now" immediately after login, and a relative time ("Xm ago") on reload — backed by `medibook_last_login` in storage.

### TC-AUTH-FE-013 — Forgot-password success state shows the correct email-provider quick-link
- **Priority:** Low
- **Preconditions:** Grounded in NEW-AUTH-003.
- **Steps:** Submit forgot-password for a `@gmail.com`, a `@outlook.com`, and an unrecognized-domain address.
- **Expected Result:** Gmail/Outlook show their respective provider quick-link button; the unrecognized domain shows no provider link (not a broken/generic one).

### TC-AUTH-FE-014 — Register tab blocks submission without Terms & Conditions acceptance
- **Priority:** Medium
- **Preconditions:** Grounded in SUG-AUTH-010.
- **Steps:** Fill the Register form completely but leave the T&C checkbox unchecked, attempt submit.
- **Expected Result:** Submit is blocked/disabled; checking the box enables it without needing to re-enter other fields.

### TC-AUTH-FE-015 — 403 page shows the attempted path and the user's current role
- **Priority:** Low
- **Preconditions:** Grounded in SUG-AUTH-012.
- **Steps:** As a `patient`, navigate to `/admin/users`.
- **Expected Result:** `Forbidden403` displays a chip with the user's actual role (`patient`) and the path that was blocked (`/admin/users`), plus a "Request Access" action — not a generic no-context 403.

### TC-AUTH-FE-016 — Mobile phone-first signup completes its full 3-step flow
- **Priority:** Medium
- **Preconditions:** Grounded in NEW-AUTH-005.
- **Steps:** Choose mobile signup, enter phone → enter OTP → complete profile fields → submit.
- **Expected Result:** All 3 steps must be completed in order (can't skip to profile without a verified OTP); final step shows a "Mobile Account Ready!" confirmation state distinct from the standard login form.
