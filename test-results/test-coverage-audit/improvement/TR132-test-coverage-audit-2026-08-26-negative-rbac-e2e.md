---
id: TR132
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP133
related: [REQ075, PLAN106]
---

# TR132 — Results for negative-RBAC e2e coverage (F-27)

Executed 2026-08-26 against the real dev stack (`medibook_backend`/
`medibook_postgres`/`medibook_frontend`) on `master`.

## Run history

First full run: 2 of 3 tests failed on a fresh browser context race
(`net::ERR_ABORTED` mid-navigation) — resolved by adding
`test.describe.configure({mode: 'serial'})`, matching the established
convention in `gap-analysis-a4-a9.spec.js`. Second run surfaced the real
`psql()`-result bug described in `REQ075` (an `INSERT ... RETURNING`'s
second "INSERT 0 1" line corrupting the captured id) — the affected
test's own assertion still passed, but for the wrong reason (a garbage
id also returns `null`), and cleanup silently failed, leaving a real
residue row. Fixed, re-verified: **3/3 passing**, confirmed zero residue
via a direct `SELECT` against `Patients` after the run.

## Live verification

Both scenarios exercised against the real running stack: `Forbidden403`
rendered for a patient hitting two real admin-only routes; a real
cross-org `patient(id)` read via the real GraphQL endpoint (after
temporarily inserting a real throwaway `Patients` row in a genuinely
different org) returned `null`.

## Commits

See the commits immediately following this test-results doc in `git log`.
