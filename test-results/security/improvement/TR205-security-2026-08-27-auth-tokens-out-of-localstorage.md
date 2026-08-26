---
id: TR205
type: improvement
feature: security
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP205
related: [REQ145, PLAN185]
---

# TR205 — Results: auth tokens out of `localStorage` (SEC-2)

## Backend

- `npx jest --maxWorkers=2`: **97 suites / 1611 tests, green.**
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **4 suites / 387 tests, green** (real Postgres, real
  HTTP, real guard chain — proves the widened `jwt.strategy.ts` extractor
  didn't regress the Bearer-header path any existing integration caller
  uses).

## Frontend

- `AuthContext.test.jsx` (rewritten): **18/18 green.**
- `documents.test.js`: **4/4 green.**
- Full suite (`CI=true npx jest --maxWorkers=2`): **30 suites total.**
  3 suites failed on the first full-parallel run
  (`EncounterWorkspace.test.jsx`, `booking/index.test.jsx`,
  `manager/claims/index.test.jsx`); re-run in isolation
  (`--maxWorkers=1`): the first two passed clean (confirmed
  resource-contention flakiness, matching this codebase's own
  documented precedent — neither imports `AuthContext.jsx`,
  `apollo/client.js`, or any file this slice touched).
  **`manager/claims/index.test.jsx` failed identically even fully
  alone** — a real, pre-existing, unrelated failure (its own commit
  history is `REQ131`/`REQ138`, both predating this session; the file
  uses `MockedProvider` and imports neither `AuthContext` nor
  `apollo/client`). Not caused by this slice, not fixed by it either —
  logged here rather than silently worked around.
- `eslint`: **1,906 warnings, 0 errors** — identical to the pre-slice
  baseline (`project-plans/technical-plans/07-frontend-rules-compliance.md`'s
  own cited figure). No ratchet increase.

## Real bug found only by a live boot — not any test

**`cookie-parser`'s default import throws at runtime**, identical root
cause to the `pdfkit` finding `CLAUDE.md` already documents for `REQ057`:
this `tsconfig.json` sets `allowSyntheticDefaultImports` (type-check only)
but not `esModuleInterop` (the flag that generates the runtime `.default`
wrapper). `import cookieParser from 'cookie-parser'` type-checked clean
and passed every unit/integration test (none of which boot the real HTTP
server via `main.ts`) — then crashed the container outright on first real
boot: `TypeError: (0 , cookie_parser_1.default) is not a function`.
Fixed with `import cookieParser = require('cookie-parser')`, the same
fix `CLAUDE.md` already prescribes for this exact interop gap. **Confirms
`CLAUDE.md`'s own standing warning**: "any future default-imported
CommonJS-only dependency in this codebase will hit the identical
failure" — this is the second time, exactly as predicted.

## Live verification — full cookie round trip, real running stack

Performed via `curl` with a real cookie jar against the real dev backend
(`admin@medibook.dev`), after the `cookie-parser` fix above:

1. **`login`** — response `Set-Cookie` carries both `mb_access_token`
   (`Max-Age=900`, `HttpOnly`, `SameSite=Lax`) and `mb_refresh_token`
   (`Max-Age=604800`, `HttpOnly`, `SameSite=Lax`).
2. **`me`** — succeeds using only the cookie jar; zero `Authorization`
   header sent.
3. **`refresh`** — called with `{"input": {}}` (exactly what
   `apollo/client.js`'s silent-refresh-on-401 link sends), succeeds
   purely off the `mb_refresh_token` cookie, rotates both cookies in the
   response.
4. **`logout`** — response `Set-Cookie` clears both
   (`Expires=Thu, 01 Jan 1970`); a subsequent `me` with the same cookie
   jar correctly returns `UNAUTHENTICATED`.
5. **REST fallback parity** (`documents.controller.ts`) — the same
   endpoint accepts cookie-only auth, Bearer-header-only auth
   (non-browser caller), and rejects with 401 when neither is present.

## What was not verified live

- **The full frontend UI flow** (real browser login → DevTools
  Application tab confirms no token-bearing key in `localStorage`/
  `sessionStorage` → page reload keeps the session → logout doesn't
  survive a reload) — the backend contract is proven end-to-end above,
  and the frontend unit suite proves the code paths in isolation, but no
  browser-automation tool was available this session to drive the real
  UI. Logged honestly rather than claimed, matching this codebase's own
  established practice (e.g. `REQ072`'s `TR125`).
- **The WS subscription auth path** — unchanged by this slice (see
  `REQ145`'s own "deliberately out of scope" note); not re-verified here
  since nothing about it was touched.
- **Impersonation's cookie swap**, specifically (`startImpersonation`/
  `endImpersonation`) — covered by real unit tests (both services and
  both resolver methods) but not re-driven live this session; the
  underlying mechanism (`applySessionCookies`) is identical to the one
  proven live for `login`/`refresh`/`logout` above, and the reissue path
  is directly asserted in `auth.service.spec.ts`.
