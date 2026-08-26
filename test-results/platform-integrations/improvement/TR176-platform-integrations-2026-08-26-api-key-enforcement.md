---
id: TR176
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP176
related: []
---

# TR176 — Test results: enforce API keys with a real guard

All 8 `TP176` cases pass.

`npx jest src/api-keys --maxWorkers=2`: 2 new suites (`api-key.guard.spec.ts`,
plus 3 new cases in `api-keys.service.spec.ts`), 11/11 tests pass.

Full backend unit suite: `npx jest --maxWorkers=2` — 91/91 suites,
1447/1447 tests (6 new vs. the 1441 baseline after REQ114).

Integration suite: `npm run test:int` (against `postgres_test`) — 4/4
suites, 387/387 tests, unchanged from the pre-slice baseline — confirms
the real `AppModule` boots cleanly with `ApiKeyGuard`/
`PublicApiController` registered via the existing `ApiKeysModule`, no
new tenancy-matrix entry needed (REST-only endpoint, same documented
exemption as `DocumentsController`).

`npx tsc --noEmit`: clean. `npx eslint src/api-keys`: clean, 0 warnings.

## Live verification

Not performed against the real dev stack (no browser/HTTP client tool
available this session for a live `curl` round trip with a real issued
key). The unit + integration coverage above exercises the exact guard
logic and real-AppModule boot path a live call would use; an honest gap
matching this session's own established convention for slices without
a live pass.
