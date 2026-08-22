---
id: PLAN028
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG007
related: [BUG006, TP055, TR054, F-25, F-01]
---

# PLAN028 — Integration harness, tenancy matrix, and the F-01 residue it exposed

Implements `BUG007` (the harness gap) and `BUG006` (the twelve leaking services
the harness found). One slice, because splitting them would mean committing a
red suite — the matrix is *expected* to fail on first run, and it did.

## Design decisions and why

### Test database: a compose service, not Testcontainers

`docker-compose.yml` gains `postgres_test` — `postgres:16-alpine`, port **5433**,
`profiles: ["test"]` so a bare `docker compose up -d` does not start it, and
**tmpfs-backed** because the whole point is that it is disposable.

Rejected Testcontainers: it adds a dependency, needs Docker-in-Docker in CI
anyway, and would not mirror the stack that already exists. A compose service
maps one-to-one onto a GitHub Actions `services:` block when F-26 lands.

A separate database, not a schema in the dev one: the fixture truncates every
table on every run, and the dev database is what the Playwright suite runs
against. `env.ts` refuses to start if `TEST_DATABASE_URL` looks like the dev URL
— a guard, not a convention, because the failure mode is silent data loss.

### A second Jest project, not a change to the existing one

`jest.config.js` stays exactly as it is: `rootDir: 'src'`, `.spec.ts`, all Prisma
mocked, ~130s. That is the fast loop and it must not get slower.

`jest.integration.config.js` is `rootDir: '.'`, `test/**/*.int-spec.ts`,
`maxWorkers: 1`. Single worker is not a performance compromise — parallel workers
share one database and would race each other's fixture rows, producing exactly
the cross-tenant confusion this suite exists to detect. A flake and a real leak
would be indistinguishable.

`ts-jest` runs with `isolatedModules: true`. Type-checking the 230-file
`AppModule` graph on every boot took **longer than the suite** — the first run
was killed at 600s and completed in 26s after the change. Types are still
enforced by the unit config, by `tsc --noEmit`, and by the editor.

### Real JWTs through the real guard chain

`actors.ts` signs genuine tokens with `JWT_ACCESS_SECRET` in the exact
`JwtPayload` shape. No guard is stubbed and no `req.user` is injected. Stubbing
any part of `GqlThrottlerGuard → GqlAuthGuard → RolesGuard` would reintroduce
the gap being closed.

### The fixture asserts absence, not presence

Every entity exists in **both** orgs with fixed ids. The load-bearing assertion
is `expect(ids).not.toContain(orgBsId)` — *not* "the caller sees something",
which a leaking query also satisfies.

Two fixture details were forced by real behaviour rather than designed up front:

- `messageableContacts` excludes the caller, so an assertion target that is also
  an actor is legitimately absent and reads as a false leak. Added `userExtraA` /
  `userExtraB` — org members that are never callers.
- `TestResults` needs **two** rows per org: one with `patient_id` set and one
  with it `NULL`. The null one is the leak vector, and CLAUDE.md documents it as
  the common shape.

## What was built

| File | Role |
|---|---|
| `docker-compose.yml` | `postgres_test` service (5433, tmpfs, `profiles: ["test"]`) |
| `backend/jest.integration.config.js` | the second Jest project |
| `test/integration/setup/env.ts` | pinned test env + dev-database guard |
| `test/integration/setup/global-setup.ts` | `migrate deploy` + fixture, once |
| `test/integration/setup/fixture.ts` | two-tenant world, fixed ids, truncate-and-rebuild |
| `test/integration/setup/actors.ts` | the 9 caller archetypes, real signed JWTs |
| `test/integration/setup/app.ts` | boots the real `AppModule`; `gql()` helper |
| `test/integration/setup/domain-cases.ts` | the domain table |
| `test/integration/tenancy.int-spec.ts` | the matrix — 115 assertions |
| `test/integration/matrix-coverage.int-spec.ts` | anti-rot gate |
| `test/integration/booking-concurrency.int-spec.ts` | `it.failing` acceptance criterion |

`domain-cases.ts` exists because `matrix-coverage` importing `tenancy.int-spec`
made Jest execute the matrix twice (115 tests reported as 230). A shared
non-spec module is the fix.

## The fixes the matrix forced

Twelve services onto `orgScope` / `orgScopeVia` / `orgIdForWrite`. Full table in
`BUG006`. Three things worth carrying forward:

1. **`orgIdForWrite` is new.** The read helpers had no write-path counterpart,
   which is why six `create` paths independently wrote `?? undefined` and
   produced org-less rows. Platform operators still get `undefined` (a global row
   is legitimate for them); everyone else fails closed.
2. **`test-results.findOne` was restructured, not swapped** — two independent
   defects (fail-open org guard, `null !== null` self-scope) in one function.
3. **Three unit specs asserted the bug** and were rewritten to assert the
   contract in both directions.

## Sequence actually followed

1. `postgres_test` up; `supertest` + `@types/supertest` added.
2. Harness built, smoke-tested (3 assertions) before writing the matrix.
3. Matrix written → **6 failures**. Four were mine (a wrong role expectation on
   the ungated `patients` query, and the self-exclusion/fixture gaps above); two
   were real. Corrected the test bugs *first*, so the matrix was trustworthy
   before it was used as evidence.
4. Captured the 2-failure run as `TR054`'s before-evidence.
5. Fixed the two live leaks → matrix green at 115.
6. Swept for the other spellings — `?? undefined`, `: undefined` — which found
   `analytics`, `reviews` and `services` that the first grep had missed.
7. Coverage gate and concurrency test added.
8. Unit suite → 5 failing suites; 3 were mine, 2 (`account`, `staff`) were bcrypt
   timeouts under worker contention and passed in isolation.
9. Green everywhere; lint and typecheck clean.

## Deliberately not in this slice

CI (F-26) and its prerequisites F-29 (the open handle — this suite needs
`--forceExit`) and F-22 (frontend lint). Ten domains remain in `KNOWN_GAPS`.
Whether `messages` and `test-results` should carry `@Auth()` at all is a separate
question, raised in `BUG006` and not answered here.
