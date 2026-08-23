---
id: TR066
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP067
related: [REQ038, PLAN040]
---

# TR066 — Results for security headers, NODE_ENV assertion, throttle redesign

Executed 2026-08-23 against the real running dev backend, on `master`.

| Case | Result | Evidence |
|---|---|---|
| TC-01/02 `assertKnownNodeEnv` | **pass** | 6/6 unit tests pass |
| TC-03 static checks | **pass** | Backend: 683/683 tests, `tsc --noEmit` clean, `eslint` clean |
| TC-04 15 rapid attempts, no throttle | **pass** | Attempts 1-5: "Invalid email or password"; attempts 6-15: "Account temporarily locked due to repeated failed attempts" — the per-account lockout, never `ThrottlerException` |
| TC-05 real login after clearing lockout | **pass** | `redis-cli DEL "auth:lockout:admin@medibook.dev"` → real login returned a real `access_token` |
| TC-06 response headers | **pass** | `curl -i`: no `Content-Security-Policy`; `Cross-Origin-Resource-Policy: cross-origin`; `Strict-Transport-Security: max-age=31536000; includeSubDomains`; `X-Content-Type-Options`, `X-Frame-Options`, etc. all present; `Access-Control-Allow-Origin: http://localhost:3000` unaffected |
| TC-07 `/uploads/` route | **pass** | `curl -i http://localhost:4000/uploads/nonexistent.png` → `404 Not Found` (route registered, responds) with the same `Cross-Origin-Resource-Policy: cross-origin` header present |

## Commit

Pending — see the commit immediately following this doc.
