---
id: PLAN084
type: bug
feature: security
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: BUG022
related: []
---

# PLAN084 — Add the missing `reset-password` page

Technical implementation plan for `BUG022`. No backend change — the real
`resetPassword` mutation (`backend/src/auth/auth.resolver.ts`) is already
correct and already tested; this is a frontend-only addition.

## New file: `frontend/src/pages/auth/reset-password.jsx`

Mirrors `forgot-password.jsx`'s own two-panel layout/visual style exactly
(same brand gradient panel, same `AuthLayout` parent route, same MUI
components) — consistency with its immediate sibling page matters more
here than fixing that page's own pre-existing, already-documented,
out-of-scope theme-token gap (Hard Rule 5's own "87 of 122 files bypass
theme tokens" note; not this fix's job to correct).

```graphql
mutation ResetPassword($input: ResetPasswordInput!) {
  resetPassword(input: $input) { success message }
}
```

State machine, mirroring `forgot-password.jsx`'s own `sent` boolean and
`settings/index.jsx`'s own password-form validation exactly:

- Read `token` from the URL via `useSearchParams` (`booking/index.jsx`'s
  own `?doctor=` pattern). If absent entirely, skip the form and show a
  direct "This link is invalid — request a new one" state with a link to
  `/forgot-password` — no point rendering a form that can never submit
  successfully.
- Two fields: `newPassword`, `confirmPassword`. Client-side validation on
  submit, matching `settings/index.jsx`'s `handlePasswordUpdate` exactly:
  `newPassword.length < 8` → inline error; `newPassword !== confirmPassword`
  → inline error. The backend's own upper/lower/digit regex is
  deliberately not duplicated client-side (same lighter-weight convention
  that page already uses) — its real rejection message is what surfaces
  on failure.
- On submit: call `resetPassword({ input: { token, new_password:
  newPassword } })`. On `data.resetPassword.success`, switch to a
  "Password updated" confirmation state with a `Button` linking to
  `/login` (mirrors `forgot-password.jsx`'s own post-success panel
  structure). On `!success` or a thrown GraphQL error, surface
  `data.resetPassword.message` / `err.message` inline via the same
  `Alert severity="error"` pattern `forgot-password.jsx` already uses —
  this is what actually shows "Invalid or expired reset token" for a
  stale/reused link.

## `App.jsx` route

```diff
  const ForgotPasswordPage = lazy(() => import('./pages/auth/forgot-password'))
+ const ResetPasswordPage  = lazy(() => import('./pages/auth/reset-password'))
  ...
  <Route element={<AuthLayout />}>
    <Route path="/login" element={...} />
    <Route path="/forgot-password" element={...} />
+   <Route path="/reset-password" element={
+     <Suspense fallback={<FullPageLoader />}><ResetPasswordPage /></Suspense>
+   } />
    <Route path="/get-started" element={...} />
  </Route>
```

Same parent `AuthLayout` block `/login`/`/forgot-password` already use —
no new layout, no auth guard needed (this route must work for a
logged-out visitor by definition).

## Testing plan (see `TP111`)

- Frontend unit — new `frontend/src/pages/auth/reset-password.test.jsx`
  (this codebase has no existing test for `login.jsx`/`forgot-password.jsx`
  either, confirmed via `find frontend/src/pages/auth -iname "*.test.*"`
  before writing this plan — first coverage for this directory):
  1. No `token` in the URL → renders the "invalid link" state, no form.
  2. A `token` present, valid submission → calls the mutation with the
     right variables, shows the success state on `{success: true}`.
  3. Client-side validation: too-short password blocks submission before
     any network call; mismatched confirm-password blocks it too.
  4. A `{success: false, message: 'Invalid or expired reset token'}`
     response renders that real message inline, not a generic one.
- e2e — new `frontend/e2e/reset-password.spec.js` (public/no-auth
  needed), against the real backend:
  1. `forgotPassword` for a real seeded account, read the raw token
     straight from the backend container's own stub log (`docker logs
     medibook_backend`, `[EMAIL STUB] Password reset token for
     <email>: <token>` — the same mechanism a real inbox would receive
     once SES exists), navigate to `/reset-password?token=<token>`, set a
     new password, submit, confirm the success state, then log in with
     the new password to prove it was really changed — reverting the
     account's password back afterward in `afterAll` so the shared demo
     account stays usable for every other spec.
  2. Navigating to `/reset-password` with no `token` shows the invalid-link
     state.
  3. Submitting a garbage token shows the real "Invalid or expired reset
     token" backend message.

## Definition of done

Matches `05-cross-cutting-conventions.md`'s own per-slice DoD: new page
lint-clean, unit-tested, e2e-verified against the real backend, no mock
fallback anywhere in the new code, responsive at 360/768/1280px
(mobile-first tier — this is a public, pre-login page), full Hard Rule 3
suite green before commit.
