---
id: PLAN163
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ123
related: [TP183, TR183]
---

# PLAN163 — Implementation plan: findings freshness + test-count script

## Change

**`project-plans/02-findings-register.md`**: status lines added to
`F-10`, `F-17`, `F-20`, `F-32`, each with the specific real-code
evidence checked (see `REQ123`'s own table) — not a bare "fixed",
matching this document's own established convention for prior status
lines (`F-01`, `F-11`, `F-19`, `F-21`, etc.).

**`scripts/test-count-status.mjs`** (new): spawns `npx jest
--maxWorkers=2 --json --silent` in `backend/`, parses the JSON summary
for suite/test pass counts, and prints a dated status line. With
`--integration`, also runs `jest.integration.config.js` the same way
(does not start `postgres_test` itself — that's a real Docker action
left to the caller, matching this session's own established caution
around infrastructure commands). Matches the existing
`scripts/check-page-data-wiring.mjs`/`archive-sweep.mjs` convention:
ESM, `fileURLToPath` for path resolution, a doc comment explaining why
it exists before the code.

**`CLAUDE.md`**: the backend unit suite command's hand-typed "645 tests
/ 50 suites" (already stale — real count 1470/92) and the integration
suite's "120 tests / 3 suites" (also stale — real count 387/4) both
replaced with a pointer to `node scripts/test-count-status.mjs[
--integration]`.

## Testing

`node scripts/test-count-status.mjs`: ran for real — printed `Backend
unit: 92/92 suites, 1470/1470 tests — green`, matching the same run's
own direct `npx jest --maxWorkers=2` output.

`node scripts/test-count-status.mjs --integration`: ran for real
against the already-running `postgres_test` container — printed
`Backend integration: 4/4 suites, 387/387 tests — green`, matching the
same run's own direct `npm run test:int` output.

`node -c scripts/test-count-status.mjs`: syntax-valid.

## Documentation

`REQ123` (this requirement), `PLAN163` (this plan), `TP183`/`TR183`
(verification), a context bundle, and index updates across all five doc
roots plus the `repo-hygiene` feature README.
