---
id: TP045
type: requirement
feature: settings
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ005
related: [PLAN016]
---

# Test plan — Profile DOB/Gender/Bio/Address, avatar upload, real TOTP 2FA (REQ005/PLAN016)

Written and executed together against the already-approved implementation plan, same pattern as TP040 for REQ005's first slice.

## Unit tests

`backend/src/account/account.service.spec.ts` (23 cases total; extended this session): `updateMyProfile` persists bio/date_of_birth/gender/structured address and returns them round-tripped; `setMyAvatarUrl` writes to the caller's own row only; `startTotpEnrollment` rejects a missing profile, generates+stores an encrypted secret with `totp_enabled` left false, returns a scannable QR data URI; `confirmTotpEnrollment` rejects when no enrollment is in progress, rejects an incorrect code without enabling 2FA, accepts a correct code and returns 10 backup codes (verified bcrypt-hashed at rest, not the plaintext codes returned to the caller); `disableTotp` requires the correct current password and clears all totp fields on success.

`backend/src/auth/auth.service.spec.ts` (29 cases total; extended this session): `login` returns a `TotpChallenge` (not tokens) when `totp_enabled` is true, with a distinct `purpose` claim on the challenge JWT; `verifyTotpLogin` rejects an expired/invalid challenge token without touching Prisma, rejects a token with the wrong purpose claim, rejects when 2FA was disabled mid-challenge, issues real tokens for a correct current TOTP code, accepts a correct backup code and consumes it (single-use — the matched code is removed from the stored array), rejects a code matching neither.

## Live e2e verification (real backend, authenticated GraphQL + REST, `manager@medibook.dev` via Playwright/Chromium)

1. Profile: filled DOB/Bio/structured India address (line1/city/state/pincode) via the real UI, saved, reloaded — all fields persisted correctly; confirmed directly against the DB row, not just UI state.
2. Avatar: uploaded a real PNG via the Settings page's file picker → `POST /account/avatar` → magic-byte-validated → written to `backend/uploads/avatars/` → `avatar_url` persisted and rendered on reload.
3. 2FA enrollment: `startTotpEnrollment` → real QR rendered client-side → computed a real TOTP code from the captured secret (RFC 6238, matching otplib's SHA-1/30s/6-digit defaults) → `confirmTotpEnrollment` succeeded, returned 10 real backup codes, `totp_enabled` flipped to true in the DB.
4. 2FA login challenge: password-only login now returns `TotpChallenge`, not tokens; a wrong code is rejected with "Incorrect code"; the real computed TOTP code succeeds and issues a real session; a backup code succeeds once and is rejected on reuse (confirmed via direct DB inspection that the stored `totp_backup_codes` array shrinks by exactly one entry).
5. Disable: password-gated disable clears `totp_enabled`/`totp_secret_encrypted`/`totp_backup_codes`, confirmed via DB.

Found and fixed two real bugs during this pass (see `TR044` for detail): (a) a `__typename` string mismatch in `login.jsx`'s union-branch check silently broke into a garbage-role session instead of showing the 2FA step; (b) `verifyTotpLogin`'s wrong-code path did up to 10 sequential bcrypt compares, slow enough under load to trip the frontend's 10s request-abort timeout — parallelized via `Promise.all`.

## Browser e2e (Playwright)

- `frontend/e2e/settings-account.spec.js`, extended: DOB/Gender/Bio/address save+revert; real avatar upload persists across reload (left in place afterward — no "remove avatar" UI exists to revert it, same accepted-debris precedent as `manager-services.spec.js`'s undeleted test row).
- `frontend/e2e/settings-2fa.spec.js`, new: full enroll → confirm → real-TOTP-login → wrong-code-rejected → backup-code-login → backup-code-reuse-rejected → disable, run against a disposable freshly-registered account (not the shared `manager@medibook.dev` — `register.jsx`'s UI is 100% mock, so registration is done via a direct GraphQL call in the test setup) so `fullyParallel` running other specs' logins against the shared account isn't put at risk.

## Responsive check

360px/768px/1280px: Profile tab (all new fields), Account & Security tab (2FA enroll/backup-code/disable dialogs) — zero horizontal overflow at any breakpoint.
