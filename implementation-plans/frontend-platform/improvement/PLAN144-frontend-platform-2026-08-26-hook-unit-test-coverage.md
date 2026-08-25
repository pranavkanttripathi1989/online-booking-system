---
id: PLAN144
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ104
related: []
---

# PLAN144 — Unit tests for `useInactivityLogout` / `usePagination`

## New files

- `frontend/src/hooks/useInactivityLogout.test.js`
- `frontend/src/hooks/usePagination.test.js`

Both use `@testing-library/react`'s `renderHook`/`act` (already a project
dependency, per `AuthContext.test.jsx`'s own `act` usage) and
`jest.useFakeTimers()` for the time-based hook, matching the fake-timer
pattern already proven in `AuthContext.test.jsx`'s own idle-timeout
describe block (including its documented `cleanup()` → `useRealTimers()`
ordering fix, to avoid the same order-dependent flakiness).

## `useInactivityLogout.test.js` — cases

1. Calls `onWarn(60)` once 15 minutes (`TIMEOUT_MS`) elapse with no
   activity, then decrements every second via `jest.advanceTimersByTimeAsync`.
2. Calls `onLogout()` and stops the countdown once it reaches 0.
3. A tracked `window` event (e.g. dispatch `keydown`) before the 15-minute
   mark resets the idle timer — no warning fires at the original mark.
4. `enabled: false` — advancing time by 20+ minutes never calls `onWarn`
   or `onLogout`.
5. Unmounting the hook mid-warning-countdown clears all timers and
   removes all `EVENTS` listeners (spy on `removeEventListener` call
   count, or assert no further `onWarn` calls after unmount + time
   advance).

## `usePagination.test.js` — cases

1. `loadData()` on mount-equivalent call populates `data` from
   `fetchFn`'s resolved `{data, pageInfo}`, and `pagination` mirrors
   `pageInfo` exactly.
2. Missing `pageInfo` fields fall back to the hook's own defaults
   (`total: 0`, `hasNextPage: false`, etc.) — matches the `??`/`||`
   fallbacks in the real code.
3. A rejected `fetchFn` leaves `loading: false` and does not throw
   (console.error is called, not surfaced to the caller).
4. `handleSearch('x')` then `handleSearch('xy')` within 400ms — `fetchFn`
   called exactly once, with `search: 'xy'`, `offset: 0` (debounce
   collapses the two calls).
5. `nextPage()` when `hasNextPage: true` calls `fetchFn` with
   `offset: pagination.offset + pagination.limit`; when `false`, does
   not call `fetchFn` again.
6. `previousPage()` clamps to `offset: 0` via `Math.max(0, ...)` rather
   than going negative.
7. `goToPage(3)` with `limit: 10` calls `fetchFn` with `offset: 20`.
8. `currentPage`/`totalPages` computed correctly from `pagination.total`/
   `limit`/`offset` (including the `limit > 0` guard — assert the `1`
   fallback if `limit` is ever `0`, matching the real ternary).

## Testing / verification

- `cd frontend && npx jest hooks/useInactivityLogout hooks/usePagination`
  — both new suites green.
- `npm test` (full suite) — confirm the existing `global` coverage
  threshold in `jest.config.cjs` still passes (it will now measure
  slightly higher than the 2026-08-23 baseline; do NOT raise the
  committed threshold numbers as part of this slice — that's a separate,
  deliberate ratchet decision each time, matching how the `no-hardcoded-
  colors` lint ratchet was handled in `REQ077`).
- `npm run lint` — clean.
- No backend changes; no live-browser verification needed (pure hook
  unit tests, no GraphQL/network surface).
