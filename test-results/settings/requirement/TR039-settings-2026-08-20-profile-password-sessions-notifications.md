---
id: TR039
type: requirement
feature: settings
created: 2026-08-20
updated: 2026-08-20
status: passed
parent: REQ005
related: [PLAN010, TP040]
---

# Test result — Profile, Password, Sessions, Deactivate, Notification Preferences (REQ005/PLAN010/TP040)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest account notification-preferences auth.service` — 14 + 4 + 22 = 40/40 passed, confirming zero regression on the touched, security-critical `auth.service.ts` from the additive `issueTokens()` signature change.

Full backend regression: `docker exec medibook_backend npm test` — **40 suites / 438 tests, all green**.

`docker exec medibook_backend npm run lint` — clean (one `no-var-requires` finding in the new spec fixed by switching to a proper `import * as crypto` before this run).

## Live e2e verification (real backend, not mocks)

All items in TP040's live-verification section executed via authenticated GraphQL calls against the running `medibook_backend` container. Notably: `changeMyPassword` and `deactivateMyAccount` were verified end-to-end against a throwaway registered test account (`e2e-throwaway-settings@medibook.dev`), including confirming the new password actually works for login and that a deactivated account can no longer log in — deliberately not run against the shared seeded demo accounts.

## Browser e2e (Playwright)

`npx playwright test e2e/settings-account.spec.js --workers=1` — **3/3 passed**. One test-authoring bug caught and fixed along the way (a fragile CSS sibling-combinator locator for the First Name field, replaced with `getByLabel`) — the failure it caused briefly left the shared `manager@medibook.dev` account's `first_name` at "Sarah E2E"; restored via a direct `updateMyProfile` call before re-running, confirmed clean on the next pass.

Ad-hoc responsive check (360/768/1280px, all three touched tabs): 0px horizontal overflow at every breakpoint.

## Frontend build sanity

`eslint` could not run in the `medibook_frontend` container (pre-existing environment issue — `eslint-plugin-jsx-a11y` declared in `package.json` but not installed; unrelated to this change, not fixed here). Verified the edited files transform cleanly instead: forced a Vite dev-server transform of `settings/index.jsx` (`curl http://localhost:3000/src/pages/settings/index.jsx` → HTTP 200, no compile error in `docker logs medibook_frontend`), and confirmed `AuthContext.jsx`'s HMR update logged cleanly with no error after its edit.

## Compile verification

`docker exec medibook_backend npx prisma generate` (run inside the container — `node_modules` is an anonymous Docker volume, not bind-mounted from the host) + `docker restart medibook_backend` → `Found 0 errors` on the first pass, no incremental-compile issues.

## Scope note

Notification preferences are real, persisted storage but not wired into any send trigger — see `context/open-questions.md` (no such trigger exists anywhere in this codebase today). 2FA, Appearance persistence, avatar upload, and Profile's DOB/Gender/Address fields remain out of scope, also logged there.
