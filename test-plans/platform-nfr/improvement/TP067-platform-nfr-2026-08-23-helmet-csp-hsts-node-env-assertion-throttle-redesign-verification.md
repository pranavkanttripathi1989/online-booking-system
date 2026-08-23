---
id: TP067
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ038
related: [PLAN040, TR066]
---

# TP067 — Verification for security headers, NODE_ENV assertion, throttle redesign

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `assertKnownNodeEnv` with `development`/`test`/`production` | Does not throw |
| TC-02 | `assertKnownNodeEnv` with `undefined`/empty string/a typo | Throws, message names the bad value |
| TC-03 | Backend full suite, `tsc --noEmit`, `eslint` | All clean |
| TC-04 | Live: 15 rapid wrong-password `login` attempts | Zero `ThrottlerException`; the separate per-account lockout takes over instead (at attempt 6, unaffected by this change) |
| TC-05 | Live: real login after clearing the lockout | Succeeds |
| TC-06 | Live: response headers on a GraphQL request | No `Content-Security-Policy` (dev); `Cross-Origin-Resource-Policy: cross-origin`; `Strict-Transport-Security` present; other helmet defaults present; CORS unaffected |
| TC-07 | Live: `/uploads/` static route | Responds (404 for a nonexistent file is expected — no real upload exists in this dev environment); same relaxed CORP header present |

## How this was checked

TC-01/02 via Jest. TC-03 via the backend container's own commands. TC-04–07
via direct `curl`/`curl -i` calls against the real running dev backend, and
`docker exec medibook_redis redis-cli DEL` to clear the lockout key this
verification itself tripped.
