---
id: BUG008
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ035
related: [F-26, F-22, F-29, F-18, BUG007, PLAN029, TP056, TR055]
---

# BUG008 — No CI, so "verify before you commit" was a convention rather than a control

## Severity

S2. The last Phase F item. It is the control that stops every other Phase F fix
from silently regressing.

## Summary

`.github/workflows` did not exist. `CLAUDE.md` Hard Rule 3 — "Run lint +
typecheck + the full test suite and confirm green before every commit. Never
commit red" — was enforced by nothing but discipline.

The record shows discipline was not sufficient, and in two cases the tooling
made compliance impossible:

- **F-01 and BUG006 both shipped with a green local suite.** No amount of
  running the suite would have caught them; that is `BUG007`'s subject.
- **`frontend/`'s `npm run lint` exited 1 immediately** and had for long enough
  that two stale `eslint-disable` directives accumulated behind it unnoticed.
  Nobody was ignoring the rule — the command could not be run at all.
- **`backend/`'s `npm test` was OOM-killed** at its default worker count on the
  development host, so "run the full test suite" had no working invocation
  either.

A rule that cannot be followed is not a rule.

## The two prerequisites, both real defects

### F-22 — the frontend lint script could never have run

```
$ npm run lint
Invalid option '--ext' - perhaps you meant '-c'?
You're using eslint.config.js, some command line flags are no longer available.
```

The script passed `--ext js,jsx`, which flat config rejects. Underneath it,
`eslint-plugin-react` was **in `package.json` but never registered in
`eslint.config.js`**. Without it, `no-unused-vars` cannot tell that an imported
component is referenced from JSX, so it flagged nearly every import in the
codebase: **2,862 false positives out of 2,892 total problems — 99%.**

Fixed by registering the plugin with `react/jsx-uses-react` and
`react/jsx-uses-vars` only. The rest of the React ruleset is deliberately left
off; this is a bug fix, not a new style regime.

That left 12 genuine errors. All 11 `jsx-a11y/no-autofocus` hits were inspected
individually and **every one is correct focus management** that the rule cannot
see in context — 4 inside modal `Dialog`s (where WAI-ARIA *requires* focus to
move in), 3 on user-initiated inline add/edit rows, and 4 on step transitions of
the multi-step login wizard. Downgraded to a warning rather than mass-disabled,
so a genuinely gratuitous future `autoFocus` still surfaces.

The 12th, `jsx-a11y/media-has-caption`, is **a real accessibility gap** and is
recorded as such rather than silenced — see `context/open-questions.md` #10.

Result: **0 errors, 197 warnings**, and `--max-warnings 197` as an explicit
ratchet that blocks new warnings while leaving the existing debt visible.

### F-29 — the backend suite was not safe to run unattended

Four symptoms, one investigation:

| Symptom | Cause | Fix |
|---|---|---|
| Integration suite needed `--forceExit` | `RedisModule` created an ioredis client and **never closed it** | `onApplicationShutdown` → `quit()` |
| `app.close()` never completed | same | same |
| `account`/`staff` specs timed out in the full run, passed alone | bcrypt cost 12 × worker contention | `BCRYPT_COST` centralised and configurable |
| `npm test` OOM-killed (exit 137) | default worker count | `jest --runInBand` |

**The Redis leak was a production bug, not a test artifact.** Nothing closed the
connection on `SIGTERM`, so a container stop left it dangling and relied on the
orchestrator's kill timeout. `PrismaService` had always had the equivalent hook;
Redis simply never got one. `main.ts` also now calls `enableShutdownHooks()`,
without which Nest never listens for the signal at all.

`BCRYPT_COST` was declared three times independently (`auth`, `users`, `staff`)
— a duplicated security parameter that could drift unnoticed. Now one module,
overridable for tests, and **refusing to start** if production tries to go below
12. Five tests pin that behaviour.

Fewer workers turned out to be both safer **and faster**: default → OOM,
2 workers → 182s, `--runInBand` → **118s**.

## Fix

`.github/workflows/ci.yml`, five jobs, every command runnable locally:

| Job | What it proves |
|---|---|
| `backend` | eslint, `tsc --noEmit`, 650 unit tests |
| `schema` | `prisma validate` + `migrate deploy` on a clean database + a drift check |
| `integration` | **the tenancy matrix** against real Postgres + Redis |
| `frontend` | lint (ratcheted), unit tests, production build |
| `structure` | the fabricated-page gate below |

`integration` is the job that matters. It is the only check here that could have
caught F-01 or BUG006 — every other one was green while both were live.

### The structural gate found seven more fabricated pages

`scripts/check-page-data-wiring.mjs` implements the plan's request for "one
structural gate that grep-based audits structurally cannot do". It inverts the
question: rather than searching for `mocks/store` imports, it asks whether a file
that clearly renders data has **any** route to real data.

On its first run it found **7 pages nobody had flagged**, on top of the 3 known:

| Page | Backend that exists and is ignored |
|---|---|
| `analytics/index.jsx` | `analytics` |
| `clinician/Patients.jsx` | `patients` |
| `manager/Billing.jsx` | `appointment-payments` |
| `patient/Appointments.jsx` | `appointments` |
| `public/landing.jsx` | `public` (already documented) |
| `staff/Appointments.jsx` | `appointments` |
| `staff/Dashboard.jsx` | `dashboard` |

Every one has a real backend module it simply does not call. Priority 3's sweep
missed all seven for the same reason four earlier audits missed
`NotificationBell.jsx` and `clinicians/detail.jsx`: they grep for `mocks/store`,
and none of these import it — they declare their own `MOCK_*` arrays.
`clinician/Patients.jsx` goes as far as `export const MOCK_PATIENTS`.

They are allowlisted with notes, not fixed here — wiring seven pages is its own
slice. The gate now fails on a new one.

## Verification

`npm test` 650/650 · `npm run test:int` 120/120 · backend eslint and
`tsc --noEmit` clean · `prisma validate` clean · frontend lint exit 0, tests 4/4,
build succeeds · wiring gate exit 0. See `TR055`.

## What this does not close

- **e2e is not in CI.** Deliberately absent rather than added untested: F-28 (the
  suite runs against the dev database and leaves rows behind — already the cause
  of two documented false failures) and F-27 (smoke-weighted, no negative-RBAC or
  cross-tenant coverage) make it unreliable as a required check today. A check
  allowed to fail is worse than no check.
- The schema drift step is `continue-on-error` because of 33 lines of
  pre-existing drift recorded in `TR053`.
- 197 frontend warnings and 167 unused variables remain.
- The workflow has not executed on GitHub — there is no remote run to point at.
