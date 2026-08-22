---
id: CTX-platform-nfr-2026-08-23-bug013
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG013
related: [BUG012, REQ035]
---

# platform-nfr — BUG013, frontend unit tests for guards/auth/booking/formatters (2026-08-23)

Second of three sequenced slices to finish `project-plans/06-execution-plan.md`'s
P1 ("prove the boundary") — the first (backend tenancy matrix) is `BUG012`.
P1.6 named `AuthContext`, `ProtectedRoute`/`RoleGuard`, booking-wizard
validation, and the date/currency formatters as where frontend test risk
concentrates, plus a real `collectCoverageFrom`/`coverageThreshold`. Before
this slice the frontend had exactly one test file.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG013 | [frontend unit tests](../../requirements/platform-nfr/bug/BUG013-platform-nfr-2026-08-23-frontend-unit-tests-guards-auth-booking-formatters.md) |
| implementation-plans | PLAN034 | [implementation](../../implementation-plans/platform-nfr/bug/PLAN034-platform-nfr-2026-08-23-frontend-unit-tests.md) |
| test-plans | TP061 | [verification plan](../../test-plans/platform-nfr/bug/TP061-platform-nfr-2026-08-23-frontend-unit-tests-verification.md) |
| test-results | TR060 | [verification results](../../test-results/platform-nfr/bug/TR060-platform-nfr-2026-08-23-frontend-unit-tests-verification.md) |
| test-suggestions | — | skipped — established testing patterns, not exploratory |

## What changed

| File | Change | Commit |
|---|---|---|
| `src/utils/dateTime.test.js` | new — all 12 formatters | `030c333` |
| `src/components/ProtectedRoute/{ProtectedRoute,RoleGuard}.test.jsx` | new — guard states + Forbidden403 | `030c333` |
| `src/context/AuthContext.test.jsx` | new — hydration, F-02 regression, login/logout, roles/permissions, idle timeout | `030c333` |
| `src/pages/booking/index.test.jsx` | new — Next-Step validation gate, all 3 steps | `030c333` |
| `jest.config.cjs` | `collectCoverageFrom` (whole tree) + `coverageThreshold` (ratchet floor + 90% guard/formatter overrides) | `030c333` |

## Outcome

6 test suites, 63 tests, all green. Coverage now measured against the whole
frontend source tree instead of nothing; the two named "guards and
formatters" targets both clear 90%. One real test-design bug found and fixed
(idle-timeout test omitting `login()`'s `sessionTimeoutMinutes` argument),
and one real, pre-existing, out-of-scope accessibility gap confirmed and
documented (the booking wizard's variation `<Select>` has no accessible
name).

## What this does not do

- Does not finish P1 — item 1.5 (realistic seed dataset + separately seeded
  e2e database) is the third sequenced slice, not started.
- Does not fix the booking wizard's unlabeled `<Select>` — flagged, not
  fixed; out of scope for a test-writing pass.
- Does not push `AuthContext.jsx`/`pages/booking/index.jsx` to 90% coverage
  — by design, per the DoD's "where risk concentrates" framing for these two
  larger files specifically.
