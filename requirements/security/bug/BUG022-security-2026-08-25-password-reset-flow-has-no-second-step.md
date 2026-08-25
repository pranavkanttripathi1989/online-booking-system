---
id: BUG022
type: bug
feature: security
created: 2026-08-25
updated: 2026-08-25
status: open
parent: null
related: []
---

# BUG022 — The password-reset flow has no second step

## Severity

S2. A real, tested backend mutation (`resetPassword`) exists and works;
the frontend simply never built the page that calls it. Not a
security defect and not the highest-traffic flow in the app, but a
genuine account-recovery dead end for any real user who forgets their
password.

## How this was found

`project-plans/08-integration-gap-analysis.md` (finding A-1), a fresh
sweep cross-checking every backend GraphQL operation against real
frontend usage.

## The defect

`backend/src/auth/auth.resolver.ts` exposes two `@Public()` mutations for
password recovery:

- `forgotPassword(input: ForgotPasswordInput!)` — looks up the account by
  email, and if found, generates a 32-byte random token, stores its
  SHA-256 hash plus a 30-minute expiry (`auth.service.ts:517-536`,
  `RESET_TOKEN_TTL_MINUTES = 30`), and "sends" it — currently a
  `console.log` stub, since no AWS SES pipeline exists yet in this
  codebase (matches the documented convention for every other
  not-yet-built email send). Deliberately returns the same
  `{success: true}` regardless of whether the account exists, to avoid
  leaking account existence.
- `resetPassword(input: ResetPasswordInput!)` — takes the raw token
  (re-hashed and matched against the stored hash) plus a `new_password`
  (server-validated: min 8 chars, at least one upper, one lower, one
  digit), and on a valid, unexpired match, updates the password and
  clears the token. Throws `BadRequestException('Invalid or expired
  reset token')` otherwise. Both real, both unit-tested
  (`auth.resolver.spec.ts`/`auth.service.spec.ts`).

`frontend/src/pages/auth/forgot-password.jsx` only calls the *first*
step — confirmed via its own `FORGOT_PASSWORD_MUTATION`. There is no
`pages/auth/reset-password.jsx`, and no matching route in `App.jsx`
(`find frontend/src/pages -iname "*reset*"` returns nothing). A user who
requests a reset sees "Check your inbox" and has nowhere to actually
enter the token they'd receive — the flow dead-ends there, permanently,
for every account on this system.

## Fix

A new `pages/auth/reset-password.jsx`:

- Reads `token` from the URL query string (`useSearchParams`, the same
  pattern `booking/index.jsx` already uses for `?doctor=`) — matching
  what a real emailed reset link would carry once the SES pipeline
  exists (`/reset-password?token=<raw_token>`).
- New-password + confirm-password fields, client-side length/match
  validation mirroring `settings/index.jsx`'s own existing "Change
  Password" tab (min 8 chars, confirm-match) — the stricter upper/lower/
  digit requirement is left to the backend's own real error message,
  matching that same page's existing, lighter-weight convention rather
  than duplicating the regex client-side.
- Calls the real `resetPassword` mutation; on success, a confirmation
  state with a link back to `/login`; on failure (invalid/expired token,
  or a validation rejection), the real backend message surfaced inline.
- New `/reset-password` route in `App.jsx`, nested under the same
  `<Route element={<AuthLayout />}>` block `/login`/`/forgot-password`
  already use — no new layout needed.
- No backend change — `resetPassword` is already correct and already
  tested.

## What this does not close

- No real email delivery exists yet for the token (`[EMAIL STUB]`
  console log only) — this is a pre-existing, already-documented,
  deliberately out-of-scope gap (no AWS SES pipeline anywhere in this
  codebase yet), not something this fix is meant to build.
- OTP/SMS-based password recovery is not part of this flow — this is the
  email-token path only, matching what the backend actually implements
  today.
