---
id: PLAN034
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG013
related: [BUG012, TP061, TR060]
---

# PLAN034 — Frontend unit tests: guards, AuthContext, booking-wizard validation, formatters

Approved via plan mode before implementation. Executed as drafted, with two
real MUI-accessibility discoveries made and worked around during
implementation (see below and `BUG013`).

## Files

- `src/utils/dateTime.test.js` (new)
- `src/components/ProtectedRoute/ProtectedRoute.test.jsx` (new)
- `src/components/ProtectedRoute/RoleGuard.test.jsx` (new)
- `src/context/AuthContext.test.jsx` (new)
- `src/pages/booking/index.test.jsx` (new)
- `jest.config.cjs` (edited — `collectCoverageFrom` + `coverageThreshold`)

No shared `test-utils.jsx` helper was needed in the end — each suite's
provider-wrapping need was small enough (one `MemoryRouter`, one
`MockedProvider`) that a shared wrapper would have added a layer of
indirection without saving meaningful duplication across only 4 files.

## Corrections made during implementation

1. **Label matching.** MUI renders a required field's visible asterisk as a
   separate child `<span>*</span>` inside the `<label>`, so a TextField
   labeled `"First Name"` has a full accessible text of `"First Name *"`.
   RTL's `getByLabelText` matches exactly by default (unlike Playwright's
   substring default, which is why the existing e2e specs' `'First Name'`
   locators already worked without noticing this). Fixed with a local
   `field(label)` helper using `{ exact: false }`.
2. **Unlabeled `<Select>`.** Confirmed via an isolated MUI probe that the
   booking wizard's real `<InputLabel>`/`<Select>` pair has no `id`/`labelId`
   wiring, so the rendered `role="combobox"` has no accessible name in the
   real DOM — not a test mistake. Queried by role alone (`getByRole('combobox')`,
   no `name` filter) since only one combobox is ever rendered at a time in
   this flow; documented as a real, minor, out-of-scope accessibility gap
   rather than silently worked around.
3. **Idle-timeout test bug.** The idle-timeout tests' own login button called
   `login(token, user)` without the `sessionTimeoutMinutes` argument, which
   `login()`'s real logic correctly treats as "clear any stale timeout" —
   silently erasing the very value the test had pre-seeded and asserting
   against. Fixed by passing the timeout through `login()`'s own fourth
   argument, matching real usage. Also switched to
   `jest.advanceTimersByTimeAsync` (the officially recommended Jest 29 +
   React 18 fake-timer pattern) and to explicit `cleanup()` before
   `jest.useRealTimers()` in `afterEach`, both good practice independent of
   the root cause, kept for robustness.

## `jest.config.cjs` — the real measured baseline

Ran `npx jest --coverage` once all five files landed:

| Metric | Measured (whole tree) |
|---|---|
| Statements | 2.46% |
| Branches | 1.64% |
| Functions | 1.71% |
| Lines | 2.75% |

`coverageThreshold.global` is set just below each of these (2.4/1.6/1.7/2.7)
— a ratchet floor, not an invented target, per the plan's own stated
approach (matching this repo's lint-warning-ratchet precedent). The two
per-path overrides (`ProtectedRoute/**/*.jsx`, `utils/dateTime.js`) are set
to 90 and both clear it (94.1% combined for the guards, 97.9% branch for
`dateTime.js`).

## Verification plan

See `TP061`.
