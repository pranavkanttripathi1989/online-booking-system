---
id: CTX-security-2026-08-27-req145
type: improvement
feature: security
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ145
related: [PLAN185, TP205, TR205]
---

# security — Auth tokens out of `localStorage` (2026-08-27)

Slice **P1-02**, second slice of Phase 1
(`project-plans/phase-plans/01-phase1-close-the-gates.md`). Closed the
`SEC-2` open gap named in `FRONTEND_RULES.md`'s own standing waiver
register: the access/refresh tokens moved from `localStorage`/
`sessionStorage` (XSS-readable) to httpOnly cookies (`mb_access_token`,
`mb_refresh_token`), set and cleared server-side by `auth.resolver.ts`.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ145 | [Auth tokens out of localStorage](../../requirements/security/improvement/REQ145-security-2026-08-27-auth-tokens-out-of-localstorage.md) |
| implementation-plans | PLAN185 | [implementation plan](../../implementation-plans/security/improvement/PLAN185-security-2026-08-27-auth-tokens-out-of-localstorage.md) |
| test-plans | TP205 | [test plan](../../test-plans/security/improvement/TP205-security-2026-08-27-auth-tokens-out-of-localstorage.md) |
| test-results | TR205 | [results](../../test-results/security/improvement/TR205-security-2026-08-27-auth-tokens-out-of-localstorage.md) |

## What shipped

- **Backend**: `auth-cookies.util.ts` (new); `jwt.strategy.ts` cookie-
  first/Bearer-fallback extractor; `app.module.ts`'s GraphQL context
  factory exposes `res`; every token-minting `auth.resolver.ts` mutation
  sets/clears cookies; `endImpersonation` now reissues a real token pair
  (a genuine new capability, not a port); `RefreshInput.refresh_token`
  optional with a cookie fallback; five REST controllers
  (`documents`, `message-attachments`, `org-branding`, `attachments`,
  `account`) gained the identical cookie-then-Bearer fallback.
- **Frontend**: `AuthContext.jsx` rewritten — no `token` in state, a
  non-sensitive `medibook_has_session` marker instead; `apollo/client.js`
  gained `credentials:'include'` and a real silent-refresh-on-401 link
  (neither `refresh` nor `logout` had ever been called from the frontend
  before this slice); five REST upload/download call sites switched off
  manual bearer headers; `login.jsx` and `admin/users/index.jsx` updated
  to the new `login()`/`startImpersonating()` signatures.

## Two real bugs found and fixed

1. **The named login-time caching defect** (`user.patient.id`/
   `user.clinician` permanently `undefined` after a fresh login) —
   closed as part of the same `AuthContext.jsx` rewrite the slice asked
   for, not a separate patch. See `REQ145`'s own "Bug closed" section.
2. **`cookie-parser`'s CJS default-import interop bug** — type-checked
   and passed every unit/integration test, then crashed the container on
   real boot (`... is not a function`). Identical root cause to the
   `pdfkit` finding `CLAUDE.md` already documents (missing
   `esModuleInterop`); fixed the same way (`import X = require(...)`).
   Only a live boot caught it — see `TR205`.

## Live verification

Full cookie round trip via `curl` against the real dev backend
(`admin@medibook.dev`): login sets both `HttpOnly`/`SameSite=Lax`
cookies → `me` succeeds cookie-only → `refresh({})` rotates both cookies
off the refresh cookie alone → `logout` clears both → `me` then
correctly 401s. REST endpoint parity (cookie vs. Bearer vs. neither)
also confirmed live. The full browser UI flow was **not** driven live
(no browser-automation tool available this session) — logged honestly in
`TR205`, not claimed.
