---
id: REQ104
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: —
related: [PLAN144, TP161, TR161]
---

# REQ104 — Close a real slice of the frontend Jest coverage gap (hooks)

## Correction to this slice's own starting premise

This slice was originally scoped against `project-plans/06-execution-plan.md`'s
P1 item 1.6 ("frontend unit tests for `AuthContext`/`ProtectedRoute`/
booking-wizard validation/currency-date utils") and `CLAUDE.md`'s own "What
Phase F did NOT close" section, both of which list this as still open.

**It is not.** `git log` shows commit `030c333` ("test(frontend): unit
coverage for guards, AuthContext, booking validation, formatters",
2026-08-23) already built real, substantive coverage for all four: 18 cases
in `AuthContext.test.jsx` (hydration, login/logout, roles/permissions,
idle-timeout, impersonation), `ProtectedRoute.test.jsx`/`RoleGuard.test.jsx`,
booking-wizard step validation (inside `booking/index.test.jsx`), and
`dateTime.test.js`. `frontend/jest.config.cjs` already carries a real
`coverageThreshold` with a 90% floor on `ProtectedRoute/**` and
`dateTime.js` specifically. This is a stale-documentation finding
(`CLAUDE.md`/`06-execution-plan.md` never got updated after the work
shipped), not a real gap — same class as the `onboarding`/`waiting-room`
staleness this codebase has caught before.

## The real, still-open gap

`jest.config.cjs`'s own `global` coverage threshold is commented: *"Measured
2026-08-23 (TR060): 2.46% stmts / 1.64% branches / 1.71% funcs / 2.75% lines.
Set just below that real number, not invented ahead of measuring — this is
a floor against regression, not a target."* The vast majority of
`frontend/src` (122+ page/component files) has no unit test at all. Closing
this fully is a large, multi-session initiative — out of scope for one
slice. This slice closes a small, real, high-value piece of it.

## What's in scope

Two currently zero-coverage, genuinely reusable hooks:

- `hooks/useInactivityLogout.js` — attaches activity listeners
  (mousemove/mousedown/keydown/touchstart/scroll/click), fires a warning
  callback after 15 minutes of inactivity, counts down 60 seconds, then
  fires a logout callback. Used by `layouts/AppShell.jsx` — every
  logged-in page in the app depends on this working correctly. Distinct
  from `AuthContext`'s own idle-timeout (that one is a single
  org-configurable timeout→logout; this one is a separate warning-then-
  countdown UX layer).
- `hooks/usePagination.js` — generic server-side pagination hook (search
  debounce, next/previous/goToPage, computed `currentPage`/`totalPages`).
  Used by `manager/rooms/index.jsx`.

## Acceptance criteria

- Given `useInactivityLogout` is mounted with `enabled: true`, when no
  activity event fires for 15 minutes, then `onWarn` is called with a
  60-second countdown that decrements every second, and `onLogout` fires
  when it reaches 0.
- Given the warning countdown is running, when a tracked activity event
  (e.g. `keydown`) fires, then the timer resets and the countdown does
  not reach 0.
- Given `enabled: false`, when time passes with no activity, then neither
  `onWarn` nor `onLogout` ever fires.
- Given the hook is unmounted, when the warning countdown was in
  progress, then no further `onWarn`/`onLogout` calls occur (listeners
  removed, timers cleared).
- Given `usePagination(fetchFn)`, when `loadData()` resolves, then `data`/
  `pagination` are set from the real `{data, pageInfo}` shape, and
  `currentPage`/`totalPages` are computed correctly.
- Given `fetchFn` rejects, when `loadData()` runs, then `loading` still
  resolves to `false` and the hook does not throw (matches the real
  `catch` + `console.error` behavior — no user-facing crash).
- Given `handleSearch(value)` is called twice within 400ms, when the
  debounce window elapses, then `fetchFn` is called exactly once, with
  the latest value.
- Given `pagination.hasNextPage: false`, when `nextPage()` is called,
  then `fetchFn` is NOT called again (no-op, matches the real guard).

## Deliberately out of scope

- Re-covering `AuthContext`/`ProtectedRoute`/`RoleGuard`/`dateTime.js`/
  booking-wizard validation — already done.
- A full sweep of the other ~120 zero-coverage files, or raising the
  `global` threshold itself — a much larger, separate initiative.
- `usePageTitle.js` (41 lines) — trivial, no real branching logic to
  regress; not worth a dedicated slice.
