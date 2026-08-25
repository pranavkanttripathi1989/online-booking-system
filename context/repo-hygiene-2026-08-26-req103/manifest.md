---
id: CTX-repo-hygiene-2026-08-26-req103
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ103
related: [PLAN143, TP160, TR160]
---

# repo-hygiene — REQ103: backend unit test speed in container (2026-08-26)

Slice 4 of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ103 | [backend test speed](../../requirements/repo-hygiene/improvement/REQ103-repo-hygiene-2026-08-26-backend-test-speed-in-container.md) |
| implementation-plans | PLAN143 | [implementation plan](../../implementation-plans/repo-hygiene/improvement/PLAN143-repo-hygiene-2026-08-26-backend-test-speed-in-container.md) |
| test-plans | TP160 | [verification plan](../../test-plans/repo-hygiene/improvement/TP160-repo-hygiene-2026-08-26-backend-test-speed-in-container.md) |
| test-results | TR160 | [verification results — pass](../../test-results/repo-hygiene/improvement/TR160-repo-hygiene-2026-08-26-backend-test-speed-in-container.md) |

## What shipped

`isolatedModules: true` added to `backend/jest.config.js`'s `ts-jest`
transform, mirroring `jest.integration.config.js`'s already-proven
tradeoff. Plus a `CLAUDE.md` note recommending the host over
`docker exec` for the unit suite, matching the existing `test:int`
callout's precedent.

## Verification

Measured, real improvement: 189.211s → 83.179s (~56% reduction) on the
full backend unit suite, with zero test-count regression (86/86 suites
passing — the count grew from 84 to 86 due to the parallel session's
own concurrently-landed `tasks` module, unrelated to this change).
`tsc --noEmit` and `eslint` both remain clean, confirming no type
coverage was lost.
