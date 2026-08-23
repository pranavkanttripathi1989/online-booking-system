---
id: REQ039
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: []
---

# REQ039 — Prisma safety-net middleware: no `findMany` returns an unbounded collection

`project-plans/06-execution-plan.md` P3.3 (F-14), **partial**. The full item
is pagination on every unbounded list resolver, matching each consumer's
existing contract — real, per-domain requirement-sized work across ~19
services (each needs a GraphQL contract change, checked against what its
frontend consumer currently expects, per Hard Rule 7). That is explicitly
**not** attempted here — see `06-execution-plan.md`'s deferred-items note.

What this closes: the gap in between. No resolver — including the ~19 not
yet given a real paginated contract — can return a genuinely unbounded
collection even before that per-domain work lands.

## Fix

`backend/src/prisma/clamp-take.middleware.ts`: a Prisma `$use` middleware
that clamps any `findMany` call with no explicit `take` to a default max of
200 rows. Extracted into its own module (not inlined in `onModuleInit()`)
specifically so it's unit-testable without a real database connection —
same rationale as `assert-known-node-env.ts` earlier this session.
`PrismaService.onModuleInit()` registers it once via `this.$use(...)`.

**`$use`, not `$extends`.** Prisma 5.22 (the version installed) supports
both; `$extends()` returns a *new* client instance rather than mutating one
in place, which doesn't compose with `PrismaService extends PrismaClient`
being Nest's single shared, injected instance. `$use` is deprecated in
favor of extensions going forward but still fully functional, and is the
only one of the two that can attach to `this` here.

## Verification

5 unit tests: clamps when `args` is entirely absent, clamps when `args` is
present but omits `take`, does **not** override an explicit `take` (even a
large one), does not touch a non-`findMany` action, and accepts a custom
default. Full backend suite 692/692. `tsc --noEmit`/`eslint` clean.

Full integration suite (183 tests, real `AppModule` + real Postgres) re-run
with the middleware active — no regressions; every existing paginated query
still returns exactly what it asked for.

Live, against the real dev backend: a query with its resolver's own default
limit (`getAuditLogs`, defaults to 50) returned exactly 50, unaffected. The
same query with an explicit `limit: 3` returned exactly 3. A genuinely
unbounded query with no `take` argument in its GraphQL signature at all
(`languages`) returned its real (small) result set without error.

See `TR068`.

## What this does not close

- **The real fix — per-domain pagination — is not done.** ~19 services
  (`staff`, `reviews`, `messages`, `products`, `rooms`, `services`,
  `test-results`, `notifications`, `lookups`, `languages`, `public`,
  `account`, `email-templates`, `notification-preferences`,
  `cancellation-rules`, and others) still have at least one `findMany`
  reachable from a GraphQL query with no pagination contract at all. This
  middleware prevents any of them from returning an *unbounded* collection;
  it does not give the frontend a way to page through more than 200 rows
  of any of them. Each domain needs its own contract change, checked
  against its real frontend consumer — genuinely separate, larger scope.
- 200 is a judgment call, not a measured number — chosen as "generous
  enough that no currently-working query is affected, small enough to be a
  real ceiling," not derived from a specific consumer's needs.
- Did not audit whether any *existing* consumer actually needs more than
  200 rows in one response today — none of this dev environment's seeded
  tables are anywhere near that size, so this couldn't be tested against
  real volume.
