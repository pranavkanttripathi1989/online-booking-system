---
id: CTX-repo-hygiene-2026-08-26-req123
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ123
related: [PLAN163, TP183, TR183]
---

# repo-hygiene — REQ123: findings freshness + live test-count script (2026-08-26)

Tenth and final slice of the next 10-slice batch
(`project-plans/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ123 | [Findings freshness + test-count script](../../requirements/repo-hygiene/improvement/REQ123-repo-hygiene-2026-08-26-findings-freshness-and-test-count-script.md) |
| implementation-plans | PLAN163 | [implementation plan](../../implementation-plans/repo-hygiene/improvement/PLAN163-repo-hygiene-2026-08-26-findings-freshness-and-test-count-script.md) |
| test-plans | TP183 | [verification plan](../../test-plans/repo-hygiene/improvement/TP183-repo-hygiene-2026-08-26-findings-freshness-and-test-count-script.md) |
| test-results | TR183 | [verification results — pass](../../test-results/repo-hygiene/improvement/TR183-repo-hygiene-2026-08-26-findings-freshness-and-test-count-script.md) |

## What shipped

Status lines added to `project-plans/02-findings-register.md`'s `F-10`,
`F-17`, `F-20`, `F-32` — all four independently re-verified against
real code/schema before writing (F-10 fixed via `REQ053`'s
break-glass/impersonation migration, F-17 via `REQ047`, F-20 confirmed
by grep across all three named files, F-32 via `REQ103`). New
`scripts/test-count-status.mjs`, run live twice during this slice
(backend unit: 92/92 suites, 1470/1470 tests; integration: 4/4 suites,
387/387 tests) — `CLAUDE.md`'s own two hand-typed, already-stale
suite/test counts replaced with a pointer to it.

## Verification

Both script invocations ran for real against the live backend suite and
`postgres_test`, not simulated. No backend/frontend source code was
touched — this slice is documentation plus a standalone tooling script.
