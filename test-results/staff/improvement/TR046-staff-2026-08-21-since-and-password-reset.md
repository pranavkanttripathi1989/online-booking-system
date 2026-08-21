---
id: TR046
type: improvement
feature: staff
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ009
related: [PLAN018, TP047]
---

# Test result — Staff since/status/password-reset (REQ009/PLAN018/TP047)

**Outcome: PASS.**

## Unit tests

`docker exec medibook_backend npm test` — full backend suite green: **46 suites / 550 tests** (8 new in `staff.service.spec.ts`, no regressions elsewhere).

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend + REST, Playwright/Chromium)

- Created `E2E Staffer ...` with `since=2023-03-15`, `status=on_leave` via the real create form. Confirmed via `psql`: `staff_status='on_leave'`, `staff_since='2023-03-15 00:00:00'`, `created_at='2026-08-21 ...'` (i.e. genuinely distinct, not a coincidental match).
- Edited the same account from `staff/edit/:id`, confirmed the sidebar/form correctly loaded "Since 2023-03-15" and "On Leave" from the real backend.
- Set a new password via the (now real, not disabled) Reset Password section, saved, then logged in as that exact account with the new password — succeeded, redirected to `/staff/dashboard` with a real JWT (`roles: ["staff"]`, correct `client_org_id`), proving the reset genuinely changed the stored, bcrypt-hashed password rather than just returning a success response.
- Cleaned up the test account afterward (both this ad-hoc verification pass and the accumulated debris from iterating on the Playwright locators beforehand).

## Browser e2e (Playwright)

`npx playwright test e2e/manager-staff.spec.js --workers=1` — 2/2 passing (the pre-existing create-only test, confirmed still green after the DTO/schema changes, plus the new create→edit→password-reset→login round trip). Both tests needed `test.slow()` (3x the default 30s budget) given the number of sequential real network round trips each performs; the extended test also needed a `page.locator('tr', {hasText: name})` click instead of `getByText(name).click()` after live debugging showed the plain text click wasn't reliably bubbling to the row's navigation handler.

## Responsive check

Not re-swept separately — `staff/new.jsx`'s Status/Start Date section and `staff/edit.jsx`'s Reset Password section reuse the same field/grid patterns already verified clean at 360/768/1280px in the original Priority 1 staff-wiring pass; no new layout structure was introduced.
