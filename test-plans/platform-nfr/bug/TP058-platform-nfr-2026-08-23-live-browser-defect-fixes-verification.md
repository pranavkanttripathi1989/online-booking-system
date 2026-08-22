---
id: TP058
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG010
related: [BUG009, PLAN031, TR057]
---

# TP058 — Verification for the three live-browser defect fixes

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — three small, well-scoped bug
fixes against already-proven patterns (`OptionalAuthShell`, `EmptyState`'s real
contract, existing role-name sets), not exploratory.

## The trap this plan has to avoid

A code-reading fix for a live-rendering bug is not evidence the bug is gone —
the whole reason `BUG010` exists is that `BUG009` shipped six pages that
compiled, linted, and queried a schema-valid contract without ever being looked
at in a browser. Every case below is a live Playwright assertion against the
running stack, not a static check.

## Per-defect contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Anonymous visit to `/` | Lands on `/`, renders `Landing` (the "Find the right doctor" hero), no redirect to `/login` |
| TC-02 | Authenticated (any role) visit to `/` | Redirects to that role's real dashboard (`getPostLoginRedirect`), not to `Landing` |
| TC-03 | Patient with zero appointments visits `/patient/appointments` | Page renders the empty state (icon + "No upcoming appointments" + "Book Appointment" button); zero console `pageerror` events |
| TC-04 | Staff/receptionist demo account, any authenticated page rendering the role badge | Badge reads "Staff", not "Patient" |
| TC-05 | Staff/receptionist account, Admin Users directory | Real role chip color, not the grey "Unknown" fallback |
| TC-06 | Staff/receptionist account, `/clinicians` | "Add Clinician" button visible |
| TC-07 | Regression: existing e2e auth/dashboard/staff specs, run single-threaded | Still green — the `AppShell` index-route removal must not break normal authenticated navigation |

## How TC-01–06 were checked

Headless Chromium via a throwaway Playwright script (not a committed spec —
these are one-off live-verification checks, not permanent regression
coverage): real login through the real `LOGIN_MUTATION` per demo role,
`page.goto()` to each target route, full-page screenshot, and
`page.on('console'/'pageerror')` capture. Run once against the pre-fix code to
confirm each defect reproduces, then again after each fix.

## How TC-07 was checked

`npx playwright test e2e/auth-login.spec.js e2e/dashboard.spec.js
e2e/manager-staff.spec.js --workers=1` — single-threaded specifically to
separate a real regression from the login endpoint's own `@Throttle({limit:5,
ttl:60_000})` guard, which a `fullyParallel` run trips on its own (multiple
specs calling `loginAs` inside the same 60s window) regardless of any code
change here.
