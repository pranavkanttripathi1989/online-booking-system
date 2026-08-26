---
id: TP205
type: improvement
feature: security
created: 2026-08-27
updated: 2026-08-27
status: approved
parent: REQ145
related: [PLAN185, TR205]
---

# TP205 — Test plan: auth tokens out of `localStorage` (SEC-2)

Well-scoped against an already-proven pattern (this codebase's existing
access/refresh-token issuance and impersonation flow) — drafted directly
per `CLAUDE.md`'s conditional-suggestion-stage rule, no `test-suggestions/`
entry.

## Backend unit

- `auth-cookies.util.spec.ts`: httpOnly/path/sameSite on both cookies;
  `secure:false` outside production, `secure:true` in production
  (env-dependent, both branches); `clearCookie` options match the
  options the cookie was set with (required for a real browser to
  actually clear it).
- `auth.resolver.spec.ts` (new — no resolver spec existed before this
  slice): every token-minting mutation sets the expected cookie(s);
  `login` sets no cookie for a `TotpChallenge` result; `logout` clears
  both cookies and never throws when `context.res` is absent (WS-path
  defensiveness); `startImpersonation` sets only the access cookie, at
  the impersonation TTL, never the refresh cookie; `endImpersonation`
  sets both cookies from the service's internal `_tokens` and the
  returned object never carries `_tokens`; `refresh` resolves
  `input.refresh_token` over the cookie when both are present, and
  falls back to the cookie when the input omits it.
- `auth.service.spec.ts` (extended): `endImpersonation` reissues a real
  token pair keyed by `real_actor_id`, not the impersonated target;
  fails cleanly (not a raw Prisma error) when the real actor's account
  is gone; `refresh({})` rejects cleanly without a Redis lookup against
  `auth:refresh:undefined`.
- `documents.controller.spec.ts` (new — no controller spec existed
  before): cookie preferred over a simultaneously-present Bearer header;
  Bearer-only fallback still works; rejects cleanly with neither.

## Frontend unit

- `AuthContext.test.jsx` (rewritten): initial hydration keyed off the
  `medibook_has_session` marker, not a token; **always** re-verifies via
  `ME_QUERY` on mount when the marker is present (a real behavior
  change from before this slice, not just a rename); `login()`'s
  immediate optimistic render vs. the fuller cached value ME_QUERY later
  persists; `logout()` performs the real mutation and clears local state
  regardless of whether it succeeds; idle-timeout auto-logout still
  fires; impersonation start/end drive a `me` re-fetch with no more
  token-stash assertions (there is nothing left to stash).
- `documents.test.js`: `credentials: 'include'` replaces every
  Bearer-header assertion.

## Real HTTP round trip (required — technical-plans/08 §7)

A mocked-Prisma backend test and a MockedProvider frontend test can each
pass while disagreeing about the actual wire contract; only a live round
trip proves cookies are actually set/read/cleared by a real browser
against the real running stack:

1. `login` (curl, cookie jar) — response headers carry `Set-Cookie` for
   both `mb_access_token` and `mb_refresh_token`, both `HttpOnly`.
2. A subsequent authenticated query (`me`) succeeds using only the
   cookie jar, no `Authorization` header sent.
3. `logout` — response clears both cookies (`Set-Cookie` with an expired
   date); the same cookie jar can no longer reach `me`.
4. `refresh` called with an empty input, cookie jar only — succeeds,
   rotates both cookies.
5. Frontend, real browser: login via the UI, confirm no
   `medibook_token`/`medibook_user`-holding-a-JWT anywhere in
   `localStorage`/`sessionStorage` (DevTools Application tab), reload
   the page and confirm the session survives, log out and confirm the
   session does not survive a reload afterward.
