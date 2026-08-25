---
id: TP160
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN143
related: [REQ103]
---

# TP160 — Test plan: backend unit test suite speed

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a routine, well-understood config change (`isolatedModules: true`,
already proven in `jest.integration.config.js`) with no behavioral
surface. Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | Full unit suite before the change | Baseline: all suites pass, ~189s measured this session |
| 2 | Full unit suite after `isolatedModules: true` | All suites still pass, same test count, measurably faster |
| 3 | `tsc --noEmit` after the change | Clean — confirms no type coverage lost by removing the in-transform check |
| 4 | `eslint` after the change | Clean |
| 5 | In-container timing (`docker exec medibook_backend npx jest`) | Measurably faster than before, though still slower than host (I/O/contention factors this slice doesn't fix) |
