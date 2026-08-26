---
id: PLAN185
type: improvement
feature: security
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ145
related: [TP205, TR205]
---

# PLAN185 — Auth tokens out of `localStorage` (SEC-2)

## Contract (technical-plans/08's five decisions)

1. **Dialect**: canonical snake_case (`access_token`, `refresh_token`) —
   unchanged, `AuthPayloadType`'s field names are untouched.
2. **Response convention**: entity-direct, unchanged — the mutation
   bodies still return `AuthPayloadType`/`LoginResultType` as before;
   only *what the frontend does with the response* changes (it no
   longer persists the raw token strings anywhere).
3. **Argument shape**: `RefreshInput.refresh_token` widened from
   required to optional (`@IsOptional()`), read verbatim from the DTO
   before changing it.
4. **Auth gate**: no gate changes — `login`/`register`/`refresh`/
   `verifyOtp` stay `@Public()`; `logout`/`startImpersonation`/
   `endImpersonation` stay authenticated/`@Auth('admin','super_admin')`
   respectively, unchanged.
5. **Invalidation**: `apolloClient.clearStore()` on logout, unchanged
   from before this slice.

## Sequencing (backend first, frontend against the real running schema)

1. `cookie-parser` installed (host **and** container — its
   `node_modules` is not the bind-mounted `./backend`, confirmed live
   this session: a host-side `npm install` alone left the container
   compiling against a stale `node_modules` with no `cookie-parser` at
   all, `Cannot find module 'cookie-parser'`, until `docker exec
   medibook_backend npm install cookie-parser @types/cookie-parser` ran
   too).
2. `auth-cookies.util.ts` (new) — the single place cookie names/options
   live, so every resolver call site and every REST controller imports
   the same constants rather than re-deriving them.
3. `jwt.strategy.ts`'s extractor widened (cookie-first, Bearer fallback)
   — checked against the WS context factory (`app.module.ts`) first:
   confirmed it still synthesizes `req.headers.authorization` from
   `connectionParams` unchanged, so the fallback covers that path with
   zero WS-specific code.
4. `app.module.ts`'s GraphQL context factory — added `res` alongside
   `req` on the HTTP branch only (**edited with `git add -p` in mind**:
   this file has an unrelated, uncommitted `TasksModule` registration
   from a separate concurrent session; the edit here is a
   non-overlapping hunk, verified with `git diff` before and after).
5. `auth.resolver.ts` — every token-minting mutation wraps its result
   through a small `applySessionCookies(context, tokens)` helper.
   `endImpersonation` required a service-level change first (see below)
   since it previously minted nothing at all.
6. `auth.service.ts#endImpersonation` — now calls the same
   `issueTokens()` every login path uses, keyed off
   `actor.real_actor_id`, returning the pair as `_tokens` (deliberately
   not a `@Field`, so it can't reach the response body even by
   accident).
7. Five REST controllers with their own bespoke bearer-auth
   (`documents`, `message-attachments`, `org-branding`, `attachments`
   (encounters), `account`) — identical cookie-then-Bearer fallback,
   copied from `documents.controller.ts`'s own precedent rather than
   re-derived per file.
8. `RefreshInput.refresh_token` → optional; `refresh` resolver resolves
   `input.refresh_token || cookie`, and `auth.service.ts#refresh` gained
   its own defensive guard against being called with neither (a direct
   unit-test target, not just a resolver-level concern).
9. **Introspected the running server** (`curl .../graphql -d
   '{"query":"{ __type ... }"}'`) after each backend batch, per
   `technical-plans/08`'s own standing caution about a silent
   watch-mode recompile race — caught nothing this time, but the step
   is not optional ceremony.
10. Frontend: `AuthContext.jsx` rewritten in full (see `REQ145`'s own
    "Bug closed" section for the login-caching fix bundled into the
    same rewrite), `apollo/client.js`'s silent-refresh link, five REST
    call sites switched to `credentials: 'include'`, two mutation call
    sites (`login.jsx`, `admin/users/index.jsx`) updated to the new
    `login()`/`startImpersonating()` signatures.

## Real findings during this slice

1. **Container `node_modules` is not the bind-mounted source.**
   `docker-compose.yml` mounts `./backend:/app` for source, but
   `node_modules` resolves to a container-local install — a host `npm
   install` silently does not reach the running container. Not
   previously documented anywhere in `CLAUDE.md`; worth carrying
   forward for any future new backend dependency.
2. **`endImpersonation` minted nothing before this slice** — a real gap
   surfaced only by removing the frontend's own token-stash mechanism:
   without a server-side reissue, ending impersonation would have had
   no way to restore the real actor's session at all once the cookie
   was the only place a token could live.
3. **`refresh` was entirely unused end-to-end on the frontend before
   this slice**, same as `logout` (`LOGOUT_MUTATION` defined, never
   called from any page). Both gaps are now closed as a direct
   consequence of moving to cookies, not a coincidence: cookies made
   both omissions load-bearing in a way `localStorage`'s "just keep
   using the old token until it 401s and reload the page" tolerance
   had been silently absorbing.

## Definition of done

- [x] Backend: 97 suites / 1608 tests green, `tsc --noEmit` clean,
  `eslint` clean, integration suite 4/4 suites / 387/387 tests green.
- [x] Frontend: full suite 30/30 suites (2 pre-existing failures in
  `manager/claims/index.test.jsx` confirmed unrelated — see `TR205`),
  lint clean at the existing 1,906-warning ratchet (no increase).
- [x] Live introspection of the running schema after every backend
  change batch.
- [ ] Real e2e round trip (login → cookie set → page reload keeps
  session → logout → cookie cleared) — see `TR205` for what was and
  was not verified live this session.
