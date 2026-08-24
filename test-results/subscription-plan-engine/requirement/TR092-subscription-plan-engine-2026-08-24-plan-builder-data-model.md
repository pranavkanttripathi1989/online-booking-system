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
| TC-09 | pass (follow-up) | See below — the container recovered after a full Docker Desktop restart. |

## Environment note (resolved 2026-08-24, same day)

`medibook_backend` had become unresponsive to `docker restart`/`stop`/
`kill` (Docker itself stayed responsive to `docker ps`, but every
lifecycle operation targeting this one container hung indefinitely — host
resource contention, not a Docker daemon crash). Resolved by quitting and
relaunching Docker Desktop entirely (`osascript -e 'quit app "Docker"'`
then `open -a Docker`), which also cleanly cycled `medibook_postgres`/
`medibook_redis` (both recovered to healthy in under 30s, no data loss —
confirmed independently by this pass's own `test:int` run against
`postgres_test`, unaffected either way). `medibook_backend` itself had
exited (not auto-restarted) after the Docker Desktop cycle and needed one
explicit `docker start medibook_backend`; the first compile took ~4
minutes under host load (a full, not incremental, compile — 8 new
modules), confirmed clean (`Found 0 errors`, `Nest application
successfully started`, `GraphQL endpoint ready`).

## Live verification (2026-08-24, follow-up)

Logged in as `admin@medibook.dev` (real seed account) — no `super_admin`
seed account exists (`seed.ts` only creates `admin`/`manager`/`clinician`/
`staff`/`patient` logins), so `plans`/`createPlan` correctly returned a
403 Forbidden for the `admin`-role caller, confirming the `@Auth
('super_admin')` gate is live and enforced — not exercised further since
no account can reach the happy path without manually elevating a role,
judged out of scope for this verification pass.

**A real bug found and fixed live** (same bug class as `pharmacy`'s own
`AdjustStockInput`, see `TR094`): `PlanInput.price` and
`CreatePlanVersionInput.price` both had zero `class-validator` decorators,
so the global `ValidationPipe`'s `whitelist:true` would silently strip
`price` from any real `createPlan`/`createPlanVersion` call before it
reached the resolver. Not caught by the unit suite (mocked-Prisma tests
never go through the real `ValidationPipe`) — found by proactively
auditing every new DTO in this session's pass after the `pharmacy` bug
surfaced live. Fixed by adding `@IsNumber() @Min(0)` to both fields. Full
suite re-confirmed green after the fix (73/73 unit, 315/315 integration);
not independently live-retested here since it requires a `super_admin`
account this environment doesn't have.
