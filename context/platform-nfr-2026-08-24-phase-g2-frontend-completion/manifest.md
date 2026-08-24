---
id: CTX-platform-nfr-2026-08-24-phase-g2-frontend-completion
type: improvement
feature: platform-nfr
created: 2026-08-24
updated: 2026-08-24
status: done
parent: PLAN073
related: [REQ018, REQ032, REQ034, REQ022, REQ030, REQ031, REQ015, REQ029, PLAN065, PLAN066, PLAN067, PLAN068, PLAN069, PLAN070, PLAN071, PLAN072]
---

# platform-nfr — Phase G+2 frontend completion (2026-08-24)

Closes the "no frontend UI in this slice" deferral on all 8 domains shipped
backend-only earlier the same day (`REQ018` residue, `REQ032`, `REQ034`,
`REQ022`, `REQ030`, `REQ031`, `REQ015`, `REQ029` 2nd slice — see
`machine-handoff-2026-08-24.md` and each domain's own
`context/<feature>-2026-08-24-*/manifest.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN073 | [Phase G+2 frontend completion](../../implementation-plans/platform-nfr/improvement/PLAN073-platform-nfr-2026-08-24-phase-g2-frontend-completion.md) |
| test-plans | TP100 | [verification plan](../../test-plans/platform-nfr/improvement/TP100-platform-nfr-2026-08-24-phase-g2-frontend-completion.md) |
| test-results | TR099 | [verification results — pass, 7/7](../../test-results/platform-nfr/improvement/TR099-platform-nfr-2026-08-24-phase-g2-frontend-completion.md) |

## What shipped

Real, tiered, theme-token-compliant UI for all 8 domains: `pages/admin/
Plans.jsx`, `pages/admin/Payers.jsx`, `pages/admin/RightsRequests.jsx`,
`pages/manager/pharmacy/index.jsx`, `pages/manager/reports/index.jsx`, and
two new tabs (Integrations, Privacy) on the existing `pages/settings/
index.jsx`. 5 new routes in `App.jsx`, matching sidebar entries in
`AppShell.jsx`. New e2e spec `frontend/e2e/phase-g2-frontend-completion.
spec.js` — 7 tests, one per surface, all against the real backend.

## Three real bugs found, one of them foundational

1. `settings/index.jsx` was missing the `CircularProgress` import used by
   the new Privacy tab's loading state — crashed the *entire* Settings
   page (all 7 tabs) for every visitor, not just Privacy. Found via a
   direct headless-browser `page.on('pageerror', ...)` capture since the
   failure rendered a blank page with no visible error text.
2. `/admin/payers` and `/admin/rights-requests` were routed behind the
   `admin`/`super_admin`-only `RoleGuard`, but their backend resolvers are
   `@Auth('manager', 'admin', 'super_admin')` — real managers, the actual
   day-to-day callers, got the app's own 403 page. Fixed by moving both
   routes into the existing "admin OR manager" `RoleGuard` block, the same
   one `/admin/communications`/`/admin/policies` already use for the
   identical reason.
3. **A genuine, pre-existing, foundational `AuthContext.jsx` bug**:
   `useAuth().user.patient.id` is permanently `undefined` for any
   freshly-logged-in patient session, because `LOGIN_MUTATION`'s cached
   `user` response has no `patient` field and the mount effect only calls
   the fuller `ME_QUERY` when no cached user exists yet — which is never
   true right after a fresh login. Confirmed independent of any frontend
   code via a direct curl repro proving the backend is correct. Worked
   around locally in the new Privacy tab (a dedicated `GET_MY_PATIENT_LINK`
   network-only query); **not fixed at the `AuthContext` level** — flagged
   as an open follow-on slice in PLAN073, since any *other* patient-facing
   feature reading `user.patient.id` from the cache hits the same bug and
   hasn't been audited here.

## Environment: a severe, unrelated mid-session host reboot

Partway through, the host machine rebooted (`uptime` dropping from ~11h to
~10min) and entered a startup-storm load spike (load average peaking at
116.53) that wedged Docker Desktop's daemon and both `medibook_backend`
and — for the first time this session — `medibook_frontend` into an "Up
but unresponsive" state repeatedly. Not a defect in this slice's code;
recovered each time via the established pattern (quit Docker Desktop
entirely, relaunch, `docker rm -f` the wedged container, `docker compose
up -d` it fresh). Full account in PLAN073's own Environment note.

## Verification

Full Hard-Rule-3 suite green: frontend lint (167 warnings, exactly the
pre-session baseline), frontend unit tests (68/68), frontend build
(clean), page-data-wiring gate (0 new fabricated pages), backend unit
tests (1053/1053, unaffected), backend integration tests (315/315 — must
run from the host, not `docker exec`, since `postgres_test`'s
`localhost:5433` connection string doesn't resolve from inside the
container's own network namespace), backend eslint (clean), backend
`tsc --noEmit` (clean). e2e: 7/7 passed.
