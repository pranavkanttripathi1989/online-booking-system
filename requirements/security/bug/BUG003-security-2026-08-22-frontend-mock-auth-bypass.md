---
id: BUG003
type: bug
feature: security
created: 2026-08-22
updated: 2026-08-22
status: done
parent: null
related: [REQ001, REQ015]
---

# Frontend client-side authentication and role bypass (F-02)

## Severity

**Critical.** Full client-side escalation to `super_admin` in two console
commands, with every admin surface reachable as a result. The backend rejects
the resulting API calls (its own tenant/role scoping is real and separately
verified), so no server data leaked through this route alone — but combined
with any surviving mock-fallback page, the forged session made fabricated data
look like a real, complete admin experience.

## Evidence (`project-plans/analysis/02-findings-register.md` F-02)

- `frontend/src/context/AuthContext.jsx`'s `getInitialState()` trusted any
  token beginning with `mock_` as fully authenticated, taking the role array
  verbatim from `localStorage.medibook_user` with no server verification at all.
- Its `meError` handler fell back to the cached `localStorage` user on a failed
  `ME_QUERY` instead of logging out — an expired, revoked, or forged token kept
  its client-side session indefinitely.
- `frontend/src/pages/auth/login.jsx` rendered five demo accounts with
  plaintext passwords as one-click buttons unconditionally (no `DEV`/`PROD`
  guard), its password-login catch block fell back to a client-side check
  accepting the account's known demo password **or** the literal strings
  `"password"`/`"demo"` for any seeded account, and its OTP flow accepted a
  hardcoded `MOCK_OTP = '123456'` that it printed directly in the UI hint —
  with no backend call of any kind behind the OTP flow.
- `frontend/src/pages/auth/login-legacy.jsx`, routed at `/login-legacy`, had
  its own separate, less obvious instance of the same `MOCK_USERS` bypass.

## Fix applied

1. **`AuthContext.jsx`** — deleted the `MOCK_USERS` export entirely; deleted
   the `mock_`-prefix branch in `getInitialState()` (a token is either a real
   JWT that `ME_QUERY` can verify, or it isn't a session); changed the
   `meError` handler to always log out (clear both `localStorage` and
   `sessionStorage`, dispatch `LOGOUT`) rather than falling back to cache.
2. **`login.jsx`** — removed the `MOCK_USERS` import and the entire
   offline/mock password fallback in `handleSignIn`'s catch block; every
   sign-in attempt is now decided by the real `LOGIN_MUTATION` response only.
   Gated the demo-account chips behind `import.meta.env.DEV`.
3. **OTP login rebuilt on the real backend** — added `REQUEST_OTP_MUTATION`
   and `VERIFY_OTP_MUTATION` to `graphql/mutations.js`, matching the existing
   `requestOtp`/`verifyOtp` resolvers' real contract exactly (phone-keyed only
   — `RequestOtpInput` has no email field, so the UI now asks for "Phone
   Number", not "email or phone"). `OtpLoginMode` calls these for real:
   `requestOtp` triggers a real Redis-backed, rate-limited, server-generated
   code (still a console-log SMS stub, pre-existing and documented separately);
   `verifyOtp` is checked server-side with real 3-attempt lockout, and success
   issues a real JWT through the same `login()`/`redirectAfterLogin` path as
   password sign-in. The hint text no longer reveals the code.
4. **`MobileSignupMode`'s already-fake signup wizard** (no real phone-signup
   backend exists; its `handleCreate` never calls `login()` or grants a
   session — confirmed before deciding this was out of scope) kept its
   existing simulated OTP-entry step working, but on its own locally-scoped
   `SIGNUP_WIZARD_DEMO_CODE` constant, clearly distinguished in comments from
   the real authentication path above it.
5. **Deleted `login-legacy.jsx` and its `/login-legacy` route** in `App.jsx`
   entirely, rather than fixing a second, less-visible copy of the same bug —
   confirmed unreferenced anywhere else (no other source file, no e2e spec).

## Verification

- **Unit/lint**: `npx eslint` on every touched file shows no new errors
  (pre-existing `jsx-a11y/no-autofocus`/unused-import warnings are the
  already-tracked, unrelated F-22 finding). `npx jest` — 4/4 passing, unaffected.
- **Live browser verification** (chrome-devtools, against the real running stack):
  - Real password login (`admin@medibook.dev`) issues a genuine JWT (`eyJhbGci...`, not `mock_`-prefixed) and lands on `/dashboard`.
  - **The bypass itself, reproduced and confirmed closed**: manually planted `localStorage.medibook_token = 'mock_admin_token_001'` plus a forged `super_admin` user object, then reloaded — the app rendered optimistically for one frame, `ME_QUERY` rejected the garbage token against the real backend, and the new `meError` handler logged out completely (`localStorage`/`sessionStorage` cleared, redirected to `/login`). The forged session was **not** honoured.
  - A known-wrong password (`"password"`, the old universal bypass string) against a real account now returns the server's real `"Invalid email or password"` — no fallback triggers.
  - Real OTP login end-to-end: requested a code for a seeded phone number, read the real server-generated code from the backend's own stub log, entered it, and was signed in with a real JWT.
- **E2E**: `auth-login.spec.js` (2/2) passes against the live stack; a stale comment there referencing the removed `MOCK_USERS` fallback was corrected in the same change. `admin-roles.spec.js`, `dashboard.spec.js`, `manager-clinics.spec.js` (6/6 combined) verified passing — confirming `loginAs()` (shared by 29 of 31 e2e specs) is unaffected across Admin and Manager roles. One transient failure seen when running 3 spec files in parallel workers was reproduced as pre-existing parallel-worker resource contention (the spec file's own header comment already documents this class of flakiness) — confirmed unrelated to this fix by re-running the same file alone (2/2 pass).

## Scope notes

- `RegisterTab`'s registration form remains a known, pre-existing, separately-flagged simulation (`"Simulate registration — replace with real GraphQL mutation when backend ready"` — its own comment) — it never grants a session, so it is not part of this authentication-bypass fix. Not touched here to avoid scope creep into a different, larger feature (a real backend `register` mutation already exists but is not wired to this form).
- The Postgres weak-default-password finding surfaced during `BUG002`'s investigation (`F-33`) is unrelated to this bug and remains open.
