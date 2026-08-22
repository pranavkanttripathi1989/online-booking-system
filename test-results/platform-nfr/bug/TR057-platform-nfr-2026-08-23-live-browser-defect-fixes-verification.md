---
id: TR057
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP058
related: [BUG009, BUG010, PLAN031, F-18]
---

# TR057 — Results for the three live-browser defect fixes

Executed 2026-08-23 against a freshly migrated (`prisma migrate deploy`) and
seeded (`prisma db seed`) `medibook_db`, via `docker compose` on the host
(Node v24.18.0, Playwright 1.62.1, Chromium headless).

## Per-defect contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 anonymous `/` renders Landing | **pass** | Pre-fix: `finalUrl` after `page.goto('/')` was `http://localhost:3000/login`. Post-fix (`c6ec756`): `finalUrl` stays `http://localhost:3000/`, screenshot shows the real "Find the right doctor. Book instantly." hero |
| TC-02 authenticated `/` redirects to role dashboard | **pass** | Admin login then `page.goto('/')`: pre- and post-fix both land on `/dashboard` — confirms the fix didn't regress the already-correct authenticated case while fixing the anonymous one |
| TC-03 patient empty-appointments renders, no crash | **pass** | Pre-fix: full-page screenshot is blank white; console shows `pageerror: Element type is invalid... Check the render method of EmptyState`. Post-fix (`c60fe7a`): screenshot shows the real empty-state icon/copy/CTA, zero `pageerror` events |
| TC-04 staff badge reads "Staff" | **pass** | Pre-fix: sidebar showed "Jamie Reception" / **Patient**. Post-fix (`f92931c`): screenshot confirms role-appropriate badge |
| TC-05 admin Users directory role chip color | **pass** | Code fix verified directly (`ROLE_STYLES` now keys the real role set); not independently re-screenshotted since `/admin/users` was outside this pass's six target pages |
| TC-06 `/clinicians` "Add Clinician" visible for staff | **pass** | Code fix verified directly (`isAdmin` now includes `staff`); not independently re-screenshotted, same reason as TC-05 |
| TC-07 e2e regression, single-threaded | **pass** | `auth-login.spec.js` 2/2, `dashboard.spec.js` 3/3, `manager-staff.spec.js` 2/2 (one re-run alone after an initial fullyParallel-induced throttle timeout, per `TP058`'s noted trap) |

## What TC-07's first (fullyParallel) run actually showed

Running the same specs under the default `fullyParallel: true` config produced
8 failures, all `page.waitForURL` timeouts inside `loginAs` — the `login`
mutation's own `@Throttle({limit:5, ttl:60_000})` guard rejecting concurrent
login attempts across specs, not a code regression. Re-run single-threaded
(TC-07's actual method) to remove that confound; all passed. Separately,
`e2e/manager-clinicians-patients.spec.js` failed even single-threaded, but on
assertions about specific pre-existing clinician/patient fixtures (e.g. a
clinician named "Sarah Mitchell" at a hardcoded id) that don't exist on this
freshly seeded database — unrelated to any of this bug's three fixes, and out
of this bug's scope (see `BUG010`'s "what this does not close").

## Static checks

`npx eslint` on all five touched files: 0 errors, 0 new warnings (12
pre-existing warnings unrelated to these changes, e.g. unused imports already
present before this session).

## Commits

`c6ec756` (root route), `f92931c` (dead role name), `c60fe7a` (EmptyState
crash), `351f6da` (CLAUDE.md documentation of both this bug and the setup gap
found while reproducing it).
