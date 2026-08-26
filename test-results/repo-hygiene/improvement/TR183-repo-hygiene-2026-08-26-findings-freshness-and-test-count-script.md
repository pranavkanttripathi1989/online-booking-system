---
id: TR183
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP183
related: []
---

# TR183 — Test results: findings freshness + test-count script

All 8 `TP183` cases pass.

Cases 1–4 (status-line accuracy): each verified by direct code/schema
read before writing, documented inline in `REQ123` and the findings
register itself — not asserted from memory.

Case 5: `node scripts/test-count-status.mjs` → `Backend unit: 92/92
suites, 1470/1470 tests — green`, matching the same session's own
`npx jest --maxWorkers=2` run from `REQ122`'s own verification.

Case 6: `node scripts/test-count-status.mjs --integration` (against
the already-running `medibook_postgres_test` container) → `Backend
integration: 4/4 suites, 387/387 tests — green`, matching the same
session's own `npm run test:int` runs throughout this batch.

Case 7: confirmed the no-flag output line reads "Backend integration:
skipped (pass --integration; requires `docker compose --profile test up
-d postgres_test` first)" — not silently blank.

Case 8: confirmed both touched `CLAUDE.md` lines no longer contain a
bare suite/test count.

## No backend/frontend code change

This slice is documentation + a standalone repo-root Node script — no
`backend/src` or `frontend/src` file was touched, so the usual backend
unit/integration/frontend-lint verification loop doesn't apply beyond
having just run it live above.

## Live verification

The script itself IS the live verification — both invocations ran for
real against the real backend suite and the real `postgres_test`
container, not simulated.
