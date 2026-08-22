---
id: CTX-platform-nfr-2026-08-22-f26
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG008
related: [F-26, F-22, F-29, F-18, REQ035, BUG007]
---

# platform-nfr — F-26, CI and its two prerequisites (2026-08-22)

**This closes Phase F.**

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG008 | [no CI](../../requirements/platform-nfr/bug/BUG008-platform-nfr-2026-08-22-no-ci-verify-before-commit-is-unenforceable.md) |
| implementation-plans | PLAN029 | [CI and prerequisites](../../implementation-plans/platform-nfr/bug/PLAN029-platform-nfr-2026-08-22-ci-and-its-two-prerequisites.md) |
| test-plans | TP056 | [CI verification](../../test-plans/platform-nfr/bug/TP056-platform-nfr-2026-08-22-ci-pipeline-verification.md) |
| test-results | TR055 | [CI results](../../test-results/platform-nfr/bug/TR055-platform-nfr-2026-08-22-ci-pipeline-verification.md) |
| test-suggestions | — | skipped — job list and prerequisites prescribed by `00-foundation-hardening.md` §6 |

## What changed in the code

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | **new** — 5 jobs: backend, schema, integration, frontend, structure |
| `scripts/check-page-data-wiring.mjs` | **new** — the structural gate; found 7 unknown fabricated pages |
| `frontend/eslint.config.js` | registered `eslint-plugin-react`; 2 a11y rules downgraded with reasoning |
| `frontend/package.json` | `lint` no longer passes `--ext`; `--max-warnings 197` ratchet |
| `frontend/src/pages/{calendar,manager/products}/index.jsx` | 2 stale `eslint-disable` directives removed |
| `backend/src/redis/redis.module.ts` | `onApplicationShutdown` → `quit()` — **fixes a production shutdown bug** |
| `backend/src/main.ts` | `enableShutdownHooks()` |
| `backend/src/common/crypto/bcrypt-cost.ts` | **new** — one configurable cost, refuses < 12 in production |
| `backend/src/{auth,users,staff}/*.service.ts` | use the shared constant instead of three literals |
| `backend/package.json` | `test` → `jest --runInBand` (was OOM-killed) |
| `backend/jest.integration.config.js` | `forceExit: true`, with the handle-probe evidence beside it |
| `context/open-questions.md` | #10 — telemedicine video has no captions track |

## Outcome

Phase F complete. `npm test` 650/650 · `npm run test:int` 120/120 · frontend lint
exit 0 (from "could not run at all") · build, typecheck, schema, wiring gate all
clean.

Two findings worth carrying forward:

1. **The Redis leak was a production bug**, not a test annoyance — `SIGTERM` left
   the connection open and `app.close()` never resolved.
2. **The structural gate found 7 fabricated pages nobody knew about**, every one
   with a real backend it ignores. Four previous grep-based audits missed them
   because they do not import `mocks/store` — they declare their own `MOCK_*`
   arrays.

## What this does not do

- **e2e is not in CI**, deliberately — blocked on F-28 (runs against the dev
  database, leaves rows behind) and F-27 (smoke-weighted, no negative-RBAC). A
  check allowed to fail reads as coverage while proving nothing.
- **The workflow has never run on GitHub.** Every command is proven locally; the
  pipeline itself is not.
- 10 fabricated pages allowlisted, not wired. 197 frontend warnings. 33 lines of
  schema drift.
