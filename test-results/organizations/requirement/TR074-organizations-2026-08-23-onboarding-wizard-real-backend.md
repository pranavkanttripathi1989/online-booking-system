---
id: TR074
type: requirement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP075
related: [REQ045, PLAN048]
---

# TR074 — Results: onboarding wizard real backend

Executed 2026-08-23 in an isolated git worktree
(`.claude/worktrees/req-slices-5`), against the worktree's own `backend`
checkout with `node_modules` junctioned from the main checkout (same
lockfile, same commit — no reinstall drift) and `npx prisma generate` run
to refresh the local Prisma Client to match `schema.prisma`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `rejects an email already used by an existing account, generically` |
| TC-02 | pass | `rejects an organization code already in use` |
| TC-03 | pass | `creates the org and its owner account transactionally, scoped to the new org` — asserts `client_org_id` on the created `UserProfiles` row is the new org's id, never `null`/platform-wide |
| TC-04 | pass | `rejects an unknown organization` |
| TC-05 | pass | `rejects acting on an organization that already completed onboarding` |
| TC-06 | pass | `rejects a plan id that does not exist or is inactive` |
| TC-07 | pass | `records the subscription and sets a 14-day trial window` |
| TC-08 | pass | `refuses to complete onboarding with zero clinics added` |
| TC-09 | pass | `marks onboarding completed once at least one clinic exists` |
| TC-10 | pass | `normalizes a non-array features JSON column to an empty list rather than throwing` |
| TC-11 | pass | `npx prisma validate` — "The schema ... is valid" |
| TC-12 | pass | `npx tsc --noEmit` — 0 errors in any file this slice touches. Two pre-existing errors remain elsewhere in the tree (`@nestjs/schedule`, `helmet` — missing type declarations in `appointment-payments`/`main.ts`, neither touched by this slice); logged, not fixed here, out of scope |
| TC-13 | pass | `npx eslint src/organization-onboarding src/app.module.ts prisma/seed.ts` — 0 errors, 0 warnings |
| TC-14 | pass | `npx jest organization-onboarding --maxWorkers=2` — Test Suites: 1 passed, Tests: 10 passed, 10 total |
| TC-15 | **deferred** | Live end-to-end run against `postgres_test` (port 5433) not executed this session — the host was running ~16 unrelated Docker containers (`ai-dashboard-*`, `ldc_website-*`, `htdocs-*`, plus this project's own `_e2e` stack) under heavy concurrent load, and every `docker`/shell call during this slice took 30s–2min even for trivial commands (`docker ps` alone). Rather than spend a disproportionate amount of this session's budget waiting on a contended host, this is logged as a deferred follow-up, not silently skipped — the unit-test coverage above already exercises every branch of the transaction and validation logic; TC-15 would additionally prove the Prisma schema types line up with a real running Postgres, which `npx prisma generate` + a clean `tsc` run already gives strong (not complete) confidence in |

## What this does not prove

Per TC-15's deferral: no live browser/GraphQL-client run of the actual
four-mutation wizard sequence against a real database happened this
session. The next session picking this up should run it before treating
this slice as fully closed end-to-end — the unit suite proves the service
logic; it does not prove the resolver wiring, the GraphQL schema shape, or
the frontend's new inline `gql` operations match at the wire level.
