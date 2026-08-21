---
id: TR044
type: requirement
feature: settings
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ005
related: [PLAN016, TP045]
---

# Test result — Profile DOB/Gender/Bio/Address, avatar upload, real TOTP 2FA (REQ005/PLAN016/TP045)

**Outcome: PASS.** Backend committed as `5e79630` (profile/avatar/2FA), frontend wiring as `4cd0a86`, e2e specs + a bcrypt-parallelization fix found during this pass as `02cb1fa` — see `git log` for exact SHAs.

## Unit tests

`docker exec medibook_backend npm test` — full backend suite green: **46 suites / 542 tests**, no regressions. Includes 23 `account.service.spec.ts` cases (14 pre-existing + 9 new this slice: profile round-trip for the new fields, avatar url write, TOTP enrollment/confirm/disable) and 29 `auth.service.spec.ts` cases (21 pre-existing + 8 new: `TotpChallenge` branch on login, `verifyTotpLogin`'s 4 outcomes).

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend + real REST endpoint, Playwright/Chromium against the running Docker stack)

Full manual pass documented in the session transcript, summarized here:

- Profile fields (DOB/Gender/Bio/structured India address) filled via the real Settings UI, saved, reloaded — confirmed persisted both in the UI and via direct `psql` inspection of the `UserProfiles` row.
- Avatar: a real PNG uploaded through the file picker → `POST /account/avatar` → magic-byte validated → written to disk → rendered from `/uploads/avatars/...` after reload.
- 2FA: full enroll → real computed TOTP code → confirm → 10 real backup codes shown once → logout → login now requires the challenge → wrong code rejected → correct TOTP code succeeds → backup code succeeds once → same backup code rejected on reuse (confirmed via DB that the stored array shrank by exactly one) → disable (password-gated) → DB confirms `totp_enabled=false` and secret/backup-codes cleared.

**Two real bugs found and fixed during this pass, not just observed:**

1. `login.jsx`'s `handleSignIn` compared the login union's `__typename` against the TypeScript class name (`'TotpChallengeType'`) instead of the actual GraphQL type name (`'TotpChallenge'`, set via `@ObjectType('TotpChallenge')` in `auth-payload.entity.ts`). This silently fell through to destructuring `undefined` `access_token`/`user` and called `login(undefined, undefined, ...)`, producing a broken session that landed on a 403 "Access Forbidden — role (unknown)" page instead of the 2FA challenge step. Fixed the string comparison; confirmed the challenge step now renders correctly.
2. `auth.service.ts`'s `verifyTotpLogin` checked up to 10 stored backup codes via a sequential `for` loop of `await bcrypt.compare(...)` calls. Reproduced via e2e: under concurrent test load on this dev machine, a genuinely-wrong code's full 10-compare sweep exceeded the frontend's 10s request-abort timeout (`apollo/client.js`) before the server responded, surfacing as "signal is aborted without reason" instead of "Incorrect code". Parallelized via `Promise.all` — a real latency fix (up to ~10x fewer round trips of sequential CPU-bound work), not just a test workaround. Backend suite re-confirmed green after the change.

## Browser e2e (Playwright)

`npx playwright test e2e/settings-account.spec.js e2e/settings-2fa.spec.js` — both files pass reliably with `--workers=1` (8/8 relevant tests, matching this project's documented dev-machine resource-contention mitigation — see the staff-domain e2e session note in CLAUDE.md); intermittent under the default 2-worker `fullyParallel` mode was root-caused to two separate, unrelated causes (a shared-account write race in `settings-account.spec.js`, fixed via `test.describe.configure({mode:'serial'})`; and the bcrypt-timing issue above in `settings-2fa.spec.js`, fixed at the source) rather than accepted as unexplained flake.

## Responsive check

360px/768px/1280px, live Playwright screenshots: Profile tab (all new fields, avatar), Account & Security tab (2FA enroll/backup-codes/disable dialogs) — zero horizontal overflow, all fields/dialogs render correctly at every breakpoint.
