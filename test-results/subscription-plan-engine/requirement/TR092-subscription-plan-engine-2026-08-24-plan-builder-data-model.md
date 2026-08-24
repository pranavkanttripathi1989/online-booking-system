---
id: TR092
type: requirement
feature: subscription-plan-engine
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP093
related: [REQ032, PLAN066]
---

# TR092 — Results: plan-builder data model and versioning

Executed 2026-08-24 as part of the consolidated verification pass covering
all 8 requirement slices in this session's second batch.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `creates a plan with its first version at version 1, price converted to paise` |
| TC-02 | pass | `throws for an unknown plan when creating a new version` |
| TC-03 | pass | `US-PLAN-02: closes the old open version and creates version 2, never mutating v1 in place` |
| TC-04 | pass | `setActive toggles a plan without touching its versions` |
| TC-05 | pass | `npx tsc --noEmit` — clean |
| TC-06 | pass | `npx eslint` — 0 errors |
| TC-07 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-08 | pass | `npm run test:int` — 4/4 suites, 315/315 tests; `plans` correctly classified `EXEMPT` in `matrix-coverage.int-spec.ts` (platform-level, no `client_org_id`) |
| TC-09 | not performed this pass | The `medibook_backend` Docker container became unresponsive to `docker restart`/`docker stop`/`docker kill` during this session's consolidated verification window (host resource contention — Docker itself remained responsive to `docker ps`, but every operation targeting this one container hung indefinitely). The full automated suite above ran clean against the same code the container would have served; a live curl/browser pass against the running GraphQL endpoint is deferred to the next session rather than skipped silently. |

## Environment note for the next session

`medibook_backend` needs a fresh `docker restart medibook_backend` (or
`docker compose restart medibook_backend`) before trusting it serves this
pass's 8 new resolver domains live — the container was left in a state
where Docker reported it "running" but stopped responding to lifecycle
commands partway through this session's verification. Confirm with
`docker logs medibook_backend --tail 5` showing `Found 0 errors` /
`GraphQL endpoint ready` before live-testing, per CLAUDE.md's own
documented "stale Prisma Client" and restart discipline.
