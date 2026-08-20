---
id: TR040
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: passed
parent: REQ006
related: [PLAN011, TP041]
---

# Test result — Booking Policies + Communication (Email) Settings (REQ006/PLAN011/TP041)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest org-settings` — 8/8 passed.

Full backend regression: `docker exec medibook_backend npm test` — **41 suites / 446 tests, all green**.

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend)

All items in TP041's live-verification section executed via authenticated GraphQL calls against the running `medibook_backend` container.

## Browser e2e (Playwright)

`npx playwright test e2e/admin-policies-communications.spec.js --workers=1` — **2/2 passed** after fixing a genuine test-timing race (not a product bug — confirmed by verifying the exact same mutation shape persisted correctly via direct GraphQL calls before touching the test).

## Frontend build sanity

`eslint` still can't run in the `medibook_frontend` container (same pre-existing, unrelated environment issue noted in TR039). Verified all three edited files (`admin/Communications.jsx`, `admin/Policies.jsx`, `App.jsx`) transform cleanly via forced Vite dev-server requests (HTTP 200, no compile error in `docker logs medibook_frontend`) and via the Playwright suite actually exercising the pages end-to-end, which would fail outright on any real syntax error.

## A real bug found and fixed, not just a feature added

`/admin/policies` and `/admin/communications` were `admin`/`super_admin`-only routes, but the backend both this plan and the earlier cancellation-rules work (PLAN009) built is scoped off `client_org_id`, which only `manager` has (admin/super_admin are deliberately platform-wide, `client_org_id: null`). Before this fix, the only roles that could reach these pages could never successfully use the org-scoped features on them — confirmed this was a real, reproducible gap (not hypothetical) by testing an admin-token mutation attempt and observing the clean "not linked to an organization" rejection. Fixed in `App.jsx` by splitting these two routes into their own manager-inclusive `RoleGuard` block.

## Scope note

SMS Settings (provider/API-key), Cancellation Policy/Late Fee sliders, Notification Templates tab, and Send Test Message tab remain out of scope — see `context/open-questions.md` #1, #6, #7 and REQ006's existing open questions.
