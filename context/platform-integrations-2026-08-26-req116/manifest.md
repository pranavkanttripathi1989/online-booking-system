---
id: CTX-platform-integrations-2026-08-26-req116
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ116
related: [PLAN156, TP176, TR176]
---

# platform-integrations — REQ116: enforce API keys with a real guard (2026-08-26)

Third slice of the next 10-slice batch (`project-plans/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ116 | [Enforce API keys](../../requirements/platform-integrations/improvement/REQ116-platform-integrations-2026-08-26-api-key-enforcement.md) |
| implementation-plans | PLAN156 | [implementation plan](../../implementation-plans/platform-integrations/improvement/PLAN156-platform-integrations-2026-08-26-api-key-enforcement.md) |
| test-plans | TP176 | [verification plan](../../test-plans/platform-integrations/improvement/TP176-platform-integrations-2026-08-26-api-key-enforcement.md) |
| test-results | TR176 | [verification results — pass](../../test-results/platform-integrations/improvement/TR176-platform-integrations-2026-08-26-api-key-enforcement.md) |

## What shipped

`ApiKeysService#verify()` shipped real and tested in `REQ015` but was
explicitly documented as unwired ("no public API exists to authenticate
into yet"). This slice is that future slice: a real `ApiKeyGuard`
(`X-API-Key` header → fresh `verify()` call → org id attached to the
request) plus one real REST endpoint (`GET /api/v1/appointments`,
minimal PHI-free shape) as its first consumer, matching
`documents.controller.ts`'s established REST-for-external-callers
pattern.

## Verification

Backend: 91/91 unit suites, 1447/1447 tests (6 new); integration 4/4
suites, 387/387 tests unchanged (confirms clean `AppModule` boot with
the new controller/guard). `tsc --noEmit`/`eslint` clean. No frontend
change. Live verification not performed — the shared dev backend
container is currently mid-flight on unrelated, uncommitted schema work
from a concurrent session (a `next_retry_at` Prisma-client-vs-schema
mismatch visible in its logs); restarting it to test this slice risked
disrupting that in-progress work, so this was deliberately skipped
rather than risking a collision.
