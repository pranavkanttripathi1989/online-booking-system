---
id: TR060
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP061
related: [BUG012, BUG013, PLAN034]
---

# TR060 — Results for the frontend unit-test slice

Executed 2026-08-23 (Node, Jest 29.7, `@testing-library/react` 16), on
`master`.

## Per-case contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 `npm test` | **pass** | 6 suites, 63 tests, all green |
| TC-02 `npm test -- --coverage` | **pass** | No threshold failures; `global` (2.4/1.6/1.7/2.7%) and both per-path 90% overrides all clear |
| TC-03 formatter fallback branches | **pass** | `dateTime.js`: 100%/97.9%/100%/100% (stmts/branches/funcs/lines) — 31/31 tests, including every `!value` fallback |
| TC-04 `ProtectedRoute` states | **pass** | 100%/100%/100%/100% — 3/3 tests (loading, redirect, pass-through) |
| TC-05 `RoleGuard`/`Forbidden403` | **pass** | 100%/92.3%/100%/100% (`RoleGuard.jsx` alone; combined with `ProtectedRoute.jsx`: 100/94.1/100/100) — 6/6 tests. One remaining uncovered branch (`location?.pathname ?? 'this page'`) is unreachable in real Router usage — `useLocation()` always returns a real location inside a Router context — left undocumented-as-a-gap rather than force-tested |
| TC-06 F-02 regression | **pass** | `'logs out when ME_QUERY is rejected, even with a cached user present'` — asserts both storages cleared and `isAuthenticated` false |
| TC-07 idle timeout | **pass** | Both cases green after the login-argument fix (see below); confirmed stable across 3 repeated runs with no flakiness |
| TC-08 booking-wizard validation | **pass** | 7/7 — all three steps, including phone's real non-enforcement and the variable-product variation gate |
| TC-09 lint | **pass** | `npm run lint`: 177 warnings (this repo's existing ratcheted baseline — `grep`-confirmed identical count before and after), 0 errors, 0 new warnings on any touched file |

## The idle-timeout bug, traced properly rather than worked around

First observed as an order-dependent flake: whichever of the two
idle-timeout tests ran first would fail, and the failure moved to whichever
test ran first depending on describe-block ordering — a classic signature
of shared mutable state or a fake-timer/cleanup ordering issue, and it was
initially treated as exactly that (fixed the `afterEach` ordering to
`cleanup()` before `jest.useRealTimers()`, and switched to
`jest.advanceTimersByTimeAsync`). Both changes are good practice and were
kept, but neither was the actual cause: re-running afterward showed the
*same* test failing deterministically every time, which is what actually
led to the real bug — the test's own login button never passed
`sessionTimeoutMinutes`, and `login()`'s real logic clears that setting
when it's omitted, erasing the test's own pre-seeded value before the timer
could ever be scheduled. Fixed by threading the timeout through `login()`'s
real fourth argument instead. Confirmed stable across 3 repeated full-suite
runs post-fix.

## Static checks

`npx eslint` on all 6 touched/new files: 0 errors, 0 new warnings.

## Commits

`030c333` (all five test files + `jest.config.cjs`).
