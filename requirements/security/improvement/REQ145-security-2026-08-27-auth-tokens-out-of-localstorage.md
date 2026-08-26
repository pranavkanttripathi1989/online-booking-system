---
id: REQ145
type: improvement
feature: security
created: 2026-08-27
updated: 2026-08-27
status: done
parent: none
related: [REQ053]
---

# REQ145 — Auth tokens out of `localStorage` (SEC-2)

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-02**.
FRONTEND_RULES.md's own compliance audit
(`project-plans/technical-plans/07-frontend-rules-compliance.md`) named
`SEC-2` (auth token in `localStorage`) as an open gap: the access and
refresh tokens were stored in `localStorage`/`sessionStorage`, readable
by any script that runs in the page — the exact class of value an XSS
finding can exfiltrate to walk away with a live session, with no browser
mechanism defending against it.

## What shipped

**Backend** — the session credential moves to an httpOnly cookie.

- `auth-cookies.util.ts` (new) — `setAccessCookie`/`setRefreshCookie`/
  `clearAuthCookies`, `httpOnly: true`, `sameSite: 'lax'`,
  `secure: NODE_ENV==='production'` (the dev stack runs over plain
  `http://localhost`; a `Secure` cookie there is silently dropped, not
  rejected loudly).
- `jwt.strategy.ts` — extractor is now cookie-first, Bearer-header
  fallback (`ExtractJwt.fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken()])`).
  The fallback is deliberate, not leftover: it keeps the WS subscription
  path (`app.module.ts`'s `connectionParams`-synthesized header) and any
  non-browser API caller working unchanged.
- `auth.resolver.ts` — `login`, `verifyTotpLogin`, `register`, `refresh`,
  `verifyOtp` set both cookies from the mutation response; `logout`
  clears them; `startImpersonation` overwrites only the access cookie
  (the impersonation token), leaving the refresh cookie as the real
  actor's own; `endImpersonation` **reissues a fresh real token pair**
  for the real actor (a genuinely new capability — see "Design decision"
  below) and sets both cookies from it.
- `RefreshInput.refresh_token` is now optional — the resolver falls back
  to the `mb_refresh_token` cookie when omitted, since the frontend never
  holds that value as a JS-readable string to pass explicitly.
- Five REST controllers with their own bespoke bearer-auth (never routed
  through the GraphQL guard chain) gained the identical cookie-first
  fallback: `documents.controller.ts`, `message-attachments.controller.ts`,
  `org-branding.controller.ts`, `attachments.controller.ts` (encounters),
  `account.controller.ts`.
- `main.ts` — `cookie-parser` middleware wired ahead of the auth guard
  chain; CORS was already `credentials: true` with an explicit origin
  (not `*`, required for the browser to honour a credentialed
  cross-origin request) — no change needed there.

**Frontend** — `AuthContext.jsx` no longer holds a `token` field in state
at all.

- A non-sensitive `medibook_has_session` boolean marker replaces the
  token as the "is there probably a session" signal for optimistic
  hydration and the 401 auto-logout heuristic — forging it grants
  nothing, it only triggers an extra `ME_QUERY` that a real (cookie-less)
  request then correctly fails.
- `apollo/client.js` — `credentials: 'include'` on the http link; the
  manual `Authorization` header attach is gone (there is no token to
  read). A **silent-refresh-on-401** link was added (none existed
  before this slice, at all — the `refresh` mutation was previously
  unused end to end on the frontend): on `UNAUTHENTICATED`, it calls
  `refresh` with an empty input (cookie-sourced), retries the original
  operation on success, and only redirects to `/login` if the refresh
  itself fails. Concurrent 401s dedupe into one refresh call.
- `documents.js` and four other REST-upload call sites
  (`EncounterWorkspace.jsx`, `messages/index.jsx`,
  `settings/index.jsx` ×2) switched from a manually-attached bearer
  header to `credentials: 'include'`.
- `login()` no longer takes a token parameter, and no longer caches the
  login/verifyTotpLogin/verifyOtp mutation's own partial `user` object
  to storage — see "Bug closed" below.
- `startImpersonating()`/`endImpersonating()` lost their entire
  token-stash/restore mechanism (raw tokens in `sessionStorage`) — the
  backend now swaps the cookie itself as part of the mutation the caller
  already runs.

## Design decision: `endImpersonation` reissues a real token pair

The pre-existing `endImpersonation` resolver only marked the
`ImpersonationSessions` row ended; it minted nothing. That was fine when
the frontend kept the real actor's own token stashed in JS
(`sessionStorage.medibook_pre_impersonation_token`) to restore verbatim.
Once the access cookie is the only place a session token lives, there is
nothing left for the frontend to restore from — so `endImpersonation`
now calls the same `issueTokens()` every login path uses, keyed off
`actor.real_actor_id`, and the resolver sets the resulting cookies. This
is a real behavioral upgrade, not a like-for-like port: the real actor's
session is now freshly rotated on ending impersonation, rather than
resurrected from a token that had been sitting in browser storage for
the impersonation's own duration.

The reissued token pair is carried resolver-side as `_tokens` — not a
`@Field` on `EndImpersonationResultType`, so it is structurally
impossible for it to reach the GraphQL response body; only the resolver
reads it to set the cookies, and it's stripped from the returned object
even so.

## Bug closed: the login-time caching defect named in the slice

`CLAUDE.md`'s own history records this exact defect: `LOGIN_MUTATION`'s
response never selects `patient`/`clinician`, but the old `login()`
cached that partial `user` object to `localStorage` directly — and the
mount-effect only called the fuller `ME_QUERY` when **no** cached user
existed, which was never true after a fresh login populated the cache
first. `user.patient.id`/`user.clinician` were permanently `undefined`
for the remainder of the session.

Fixed generally, not with another per-page workaround: `login()` now
dispatches the mutation's partial `user` for an immediate optimistic
render only, never caches it, and always calls `fetchMe()` — whose
success effect is the *only* place a user object is written to storage.
The mount effect was also tightened to always re-verify via `ME_QUERY`
when the session marker is present, not only when no cached user
exists — closing a related, previously-unexercised gap where a
revoked/expired session kept showing a stale "logged in" UI until some
unrelated query happened to 401.

## Silent refresh on 401 — real, not previously existing

`LOGOUT_MUTATION` existed in `graphql/mutations.js` before this slice
but no page ever called it (`AuthContext.logout()` was local-storage-only);
`refresh` had an equivalent gap — defined server-side, never called from
the frontend at all. Without a refresh path, the access cookie's 15-minute
TTL (`auth.service.ts`'s `ACCESS_TTL_SECONDS`) would have forced a
re-login every 15 minutes of otherwise-active use, a real regression this
slice could not ship with. `apollo/client.js`'s new error-link handler
closes both gaps: `logout()` now performs the real server round trip
(revoking the refresh token in Redis, clearing both cookies) before
clearing local state, and a 401 triggers one deduped silent refresh
before falling back to a real logout-redirect.

## Deliberately out of scope

- **The WS subscription auth path is unchanged.** `app.module.ts`'s
  context factory still synthesizes `req.headers.authorization` from
  `connectionParams` for the `graphql-ws` transport — cookies have no
  natural WS-handshake equivalent in this codebase's current wiring, and
  no page was found wiring `connectionParams` with a live token at all
  (a separate, pre-existing gap noted but not investigated further here,
  since fixing it is unrelated to the localStorage-token removal this
  slice is scoped to).
- **No admin UI configures the cookie's `sameSite`/TTL values** — they
  are fixed constants, matching every other auth constant in this
  codebase (`ACCESS_TTL_SECONDS`, `REFRESH_TTL_SECONDS`) being
  code-level, not admin-configurable.

## Exit criteria (from the phase-plan slice)

- [x] No auth token in web storage — `localStorage`/`sessionStorage`
  hold only the non-sensitive `medibook_has_session` marker and a cached
  (non-credential) user object.
- [x] The `AuthContext.jsx` login-time caching defect closed.
