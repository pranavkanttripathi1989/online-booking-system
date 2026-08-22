---
id: TP061
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG013
related: [BUG012, PLAN034, TR060]
---

# TP061 — Verification for the frontend unit-test slice

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — adding real coverage to
already-identified, already-scoped targets against established testing
patterns (RTL, MockedProvider, MemoryRouter), not exploratory.

## The trap this plan has to avoid

A coverage number can look real while the tests underneath assert almost
nothing (e.g. rendering a component and checking it doesn't throw). Every
case below checks that the tests assert real, user-visible behavior — the
disabled/enabled state of a real button, real redirect targets, real
storage side effects — not just "no crash."

## Per-case contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `npm test` (frontend) | All 6 suites, including the 5 new ones, pass |
| TC-02 | `npm test -- --coverage` | No threshold failures — the `global` ratchet floor holds, and both per-path 90% overrides (`ProtectedRoute/**/*.jsx`, `dateTime.js`) clear it |
| TC-03 | `dateTime.test.js`'s falsy-input branches | Every formatter's documented `—`/`''` fallback is asserted, not just its happy path |
| TC-04 | `ProtectedRoute.test.jsx` | Loading spinner, `/login` redirect, and authenticated pass-through are each a distinct test against real rendered output |
| TC-05 | `RoleGuard.test.jsx` | Role-match, no-match (→ `Forbidden403`), and the no-`roles`-prop default all render distinct, correct output; `Forbidden403`'s "unknown" fallback and "Go Back" `window.history.back()` call are both exercised |
| TC-06 | `AuthContext.test.jsx` — F-02 regression | A rejected `ME_QUERY` clears both storages and logs out, even with a cached user present — asserted as its own named case, not folded into a generic error test |
| TC-07 | `AuthContext.test.jsx` — idle timeout | Logout fires after the real configured interval with no activity, and does NOT fire if a tracked event resets it first — both against the real effect, not a mocked timer count |
| TC-08 | `pages/booking/index.test.jsx` | Each of the 4 required Step-1 fields individually still blocks "Next Step" (not just the all-filled case), phone's real non-enforcement is asserted explicitly, and the variable-product variation gate is proven via a real MUI Select interaction |
| TC-09 | Regression | `npm run lint`: 0 new warnings/errors on every touched file |

## How TC-01–02 were checked

`cd frontend && npm test` and `npm test -- --coverage`, against the real
Jest config — not a subset run, so a regression in an unrelated existing
suite (`PermissionMatrix.test.jsx`) would also surface here.

## How TC-06–08 were checked

Each is a behavioral assertion against real rendered DOM state (button
`disabled` attribute, `localStorage`/`sessionStorage` contents, redirected
route content) via `@testing-library/react` and `@apollo/client/testing`'s
`MockedProvider` — not a shallow render or a mock-call-count check, matching
this repo's own stated preference (established in the backend's tenancy
matrix) for asserting real outcomes over asserting that internals were
called correctly.
