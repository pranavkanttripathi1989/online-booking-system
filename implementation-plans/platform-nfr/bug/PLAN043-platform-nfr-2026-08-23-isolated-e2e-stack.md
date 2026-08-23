---
id: PLAN043
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG018
related: [REQ035, BUG017, BUG007]
---

# PLAN043 — P1.5: a separate, seeded e2e database + backend + frontend stack

Closes `project-plans/06-execution-plan.md` P1 item 1.5 (finding F-28: "the
development database is the test database"). Until this slice, every
`frontend/e2e/*.spec.js` ran against the shared dev stack's real database
(`medibook_db`) — this session had already hit that fragility directly
(`db-dumps/` had to be restored to recover 8 specs' hardcoded fixture rows;
orphaned `E2E Service *`/`e2e-clinician-*` rows from failed cleanups had to
be removed by hand).

## Why a full second backend + frontend, not just a second database

Investigated before building: the backend is a single process bound to one
`DATABASE_URL` (no per-request tenant database switching), and the
frontend's GraphQL endpoint (`VITE_GRAPHQL_URL`) is a Vite env var baked in
at dev-server-start time, not something a browser can be told to use
differently per test run. `main.ts`'s CORS `origin` is also a single static
string from `FRONTEND_URL`, not a list. The only way to give e2e an
isolated database without disrupting the shared dev stack (which stays up
for manual work) is a second backend instance pointed at a second database,
with a second frontend origin to match it.

## What was built

**`docker-compose.yml`**, new `e2e` profile (mirrors the existing `test`
profile's pattern):

| Service | Port (host) | Key env |
|---|---|---|
| `postgres_e2e` | `5435:5432` | `POSTGRES_DB=medibook_e2e`, tmpfs-backed, health check |
| `backend_e2e` | `4001:4000` | `DATABASE_URL` → `postgres_e2e`; `REDIS_URL=redis://redis:6379/1` (same Redis container, logical DB 1, so e2e's rate-limit/queue traffic can't collide with the dev stack's); `FRONTEND_URL=http://localhost:3101`; JWT/encryption secrets reused from the dev `.env` (a throwaway tmpfs database needs non-empty secrets, not unique ones — `jwt.strategy.ts` throws on boot otherwise, F-11) |
| `frontend_e2e` | `3101:3000` | `VITE_GRAPHQL_URL=http://localhost:4001/graphql`, `VITE_GRAPHQL_WS_URL=ws://localhost:4001/graphql` |

`backend_e2e`'s `command` folds reset-and-seed into every (re)start: `sh -c
"npx prisma migrate deploy && npx ts-node prisma/seed-e2e.ts && npm run
start:dev"`. Reset-between-runs is `docker compose --profile e2e up -d
--force-recreate` — `postgres_e2e`'s tmpfs is only wiped on container
recreation (confirmed the hard way, see `BUG018`), which is what makes the
next startup's `migrate deploy` run against a genuinely empty schema instead
of a leftover one.

**`backend/prisma/seed-e2e.ts`** (new, 355 lines) — deliberately
non-idempotent (`.create()` throughout, no upserts), matching a genuinely
fresh database on every run:

- 2 `ClientOrganizations`, 5 `Clinicians` — one of the five is the *exact*
  existing fixture 8 pre-existing e2e specs already hardcode: `Sarah
  Mitchell` at id `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`, clinic `MG Road
  Clinic`, with availability on every day of the week (matching this
  session's `BUG011` fix). This slice adds volume *around* the existing
  contract, not a replacement — zero pre-existing specs needed editing for
  fixture-id reasons.
- 200 `Patients`, 2,000 `Appointments` spread across a rolling -30..+60 day
  window, plus `AppointmentPayments`, `Messages`/`MessageThreads`, and the 5
  demo login accounts (`admin@medibook.dev` etc.) `frontend/e2e/helpers.js`'s
  `loginAs()` depends on.

**`frontend/playwright.config.js`**: `webServer.url` now reads
`process.env.E2E_BASE_URL` (was hardcoded `http://localhost:3000`), so
Playwright detects and reuses the already-running `frontend_e2e` container
instead of trying to start a second local dev server on port 3000.

**`frontend/scripts/run-e2e-isolated.cjs`** (new) — sets `E2E_BASE_URL`,
`E2E_GRAPHQL_URL`, `E2E_DB_CONTAINER`, `E2E_DB_NAME` via `process.env` before
spawning `playwright test`, avoiding a `cross-env`-style dependency and
staying correct on PowerShell/cmd/bash alike. Forces `--workers=1` unless the
caller passes their own `--workers` — measured live: even `--workers=4` left
50/66 tests failing on the same `page.goto`/`waitForURL` timeout pattern, not
browser resource contention but the login mutation's own
`@Throttle({limit:5, ttl:60_000})` guard (the same flakiness shape already
seen against the dev stack earlier this session). Wired as
`"e2e:isolated"` in `frontend/package.json`, alongside the unchanged
`"e2e"` script (still targets the shared dev stack for quick manual runs).

## What this deliberately does not do

- Does not wire e2e into CI — `.github/workflows/ci.yml` already defers that
  to F-27 (smoke-weighted specs, no negative-RBAC coverage), a separate,
  un-scoped finding.
- Does not change any pre-existing e2e spec's assertions or fixture ids —
  the new seed is additive volume around the same hardcoded contract.
- Does not touch `backend/test/integration/` — that suite already has its
  own separate, correctly-isolated database (`postgres_test`) and didn't
  need to change.

## Verification

See `BUG018` for the two real bugs found while building and validating this
(the seed script's own exclusion-constraint collisions, and a scoping gap in
`test-results`), and `TR069` for the full-suite run results against the
isolated stack.
