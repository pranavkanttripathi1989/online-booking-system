---
id: TP070
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG018
related: [PLAN043, BUG017, BUG019, TR069]
---

# TP070 — Verification for the isolated e2e stack and its seed-script fixes

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `docker compose --profile e2e up -d --force-recreate postgres_e2e backend_e2e frontend_e2e` | All three containers reach `Started`/`Healthy`; `backend_e2e` logs `GraphQL endpoint ready`, no crash-loop |
| TC-02 | `npx tsc --noEmit` / `npx eslint prisma/seed-e2e.ts` after all seed-script fixes | Both clean |
| TC-03 | Live GraphQL: authenticate as `manager@medibook.dev` against `http://localhost:4001/graphql`, query `testResults` | Returns the seeded `Priya Sharma` / `Blood Test` row (previously `[]`, `BUG018` bug 4) |
| TC-04 | Repeat TC-01 a second, independent time (fresh `--force-recreate`) | Same clean result — confirms the fix is not a one-off, non-deterministic pass |
| TC-05 | `cd frontend && npm run e2e:isolated` — full 66-spec suite against the isolated stack, `--workers=1` | Run to completion; compare against the prior baseline (46 passed / 20 failed, run4, pre-fix) |
| TC-06 | Every failure in TC-05's result | Individually triaged: fixed-by-this-slice, a genuine new app bug (documented, not force-fit), or a fixture-literal mismatch out of this slice's scope — none silently ignored |
| TC-07 | `admin-roles.spec.js` result | Expected to still fail — pre-existing, documented (`CLAUDE.md`: "doesn't count toward this... exercises `admin/Roles.jsx`, which is still 100% `mocks/store.js`-driven") |

## How this was checked

TC-01/TC-04 via `docker logs medibook_backend_e2e` after each
`--force-recreate`. TC-02 via `docker exec medibook_backend npx tsc
--noEmit` / `npx eslint "prisma/seed-e2e.ts"` (run against the main dev
container, which shares the same source tree via bind mount). TC-03 via a
direct `curl` GraphQL login + query against `http://localhost:4001/graphql`.
TC-05 via `npm run e2e:isolated`, redirected to a log file and run as a true
background process (not backgrounded twice — see `TR069` for the process
hygiene note). TC-06 via reading every failure's error detail from the log
and cross-referencing the relevant page/resolver/seed-script source.
