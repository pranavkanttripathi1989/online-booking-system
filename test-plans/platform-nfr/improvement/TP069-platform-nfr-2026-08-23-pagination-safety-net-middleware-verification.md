---
id: TP069
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ039
related: [PLAN042, TR068]
---

# TP069 — Verification for the pagination safety-net middleware

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `findMany` with `args` entirely absent | Clamped to `DEFAULT_MAX_TAKE` |
| TC-02 | `findMany` with `args` present but no `take` | Clamped |
| TC-03 | `findMany` with an explicit `take` (including a large one) | Untouched |
| TC-04 | A non-`findMany` action (`findFirst`, `create`, ...) | Untouched |
| TC-05 | A custom default passed to `clampTakeMiddleware(n)` | Uses `n`, not the module default |
| TC-06 | Full backend unit suite, `tsc --noEmit`, `eslint` | All clean |
| TC-07 | Full integration suite (183 tests, real `AppModule` + real Postgres) with the middleware active | No regressions |
| TC-08 | Live: a query using its resolver's own default limit | Returns exactly that default, unaffected |
| TC-09 | Live: the same query with an explicit smaller limit | Returns exactly that count |
| TC-10 | Live: a genuinely unbounded query (no `take` in its GraphQL signature at all) | Returns its real result set without error |

## How this was checked

TC-01–05 via Jest unit tests against the extracted, standalone middleware
function (no real database connection needed). TC-06 via the backend
container's own commands. TC-07 via `npm run test:int` from the host. TC-08–10
via direct `curl` GraphQL calls against the real running dev backend
(`getAuditLogs` for TC-08/09, `languages` for TC-10).
