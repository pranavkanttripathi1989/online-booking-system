---
id: TR048
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ011
related: [PLAN020, TP049]
---

# Test result — Notification Templates real backend (REQ011/PLAN020/TP049)

**Outcome: PASS.**

## Unit tests

`docker exec medibook_backend npm test` — full backend suite green: **46 suites / 552 tests**, no regressions.

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend, Playwright/Chromium)

- Notification Templates tab shows the 5 real seeded rows; confirmed via `psql` this matches the actual `EmailTemplates` table contents exactly (name/type/is_active).
- Toggled "Appointment Confirmation" off via the real UI — confirmed `is_active=f` in the DB — then back on — confirmed `is_active=t` restored.
- Preview dialog for "Appointment Cancellation" showed the real stored subject (`Appointment Cancelled — {{patient_name}}`) and body, not a placeholder.
- Edit icon click navigated to `/admin/email-templates` correctly.

## Browser e2e (Playwright)

`npx playwright test e2e/admin-policies-communications.spec.js --workers=1` — 3/3 passing (the file's 2 pre-existing manager-scoped tests plus the new admin-scoped Notification Templates test).

## Lint

`npx eslint src/pages/admin/Communications.jsx e2e/admin-policies-communications.spec.js` — 0 errors (pre-existing unrelated warnings only).

## Responsive check

360px/768px/1280px, live Playwright screenshots — template cards render cleanly at every breakpoint, no overflow.
