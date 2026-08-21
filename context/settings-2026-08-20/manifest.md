---
feature: settings
date: 2026-08-20
ids: [REQ005, PLAN010, TP040, TR039, PLAN016, TP045, TR044]
status: done
---

# settings — 2026-08-20 (closed 2026-08-21)

Requirement written, grounded in `settings/index.jsx`'s actual 5-tab structure (Profile, Account & Security, Notifications, Appearance, Clinic) and confirmed zero real GraphQL anywhere in the file.

Profile (name/phone only), Account & Security (password change, sessions list/revoke, deactivate), and Notifications preferences were built first (PLAN010/TP040/TR039) — see those docs for the two contract findings made mid-build: `updateUser` couldn't be safely reused for self-service (IDOR risk), and there is no notification-send pipeline anywhere in the codebase for the new preferences to plug into yet (closed separately under `REQ008`, see `context/notifications-2026-08-21/manifest.md`).

**Closed 2026-08-21** (PLAN016/TP045/TR044): the remaining gap — 2FA, avatar upload, Profile's DOB/Gender/Address — is now built, tested, and live-verified end-to-end. 2FA is real TOTP (QR enrollment, single-use bcrypt-hashed backup codes, a `LoginResult` GraphQL union), built per explicit user direction rather than the smaller remove/hide option. Avatar storage is local filesystem (no AWS credentials in this environment), with a documented S3 swap path. Two real bugs found and fixed during live verification: a `__typename` string mismatch in `login.jsx` that silently broke the 2FA challenge step, and a sequential (now parallelized) bcrypt backup-code check in `verifyTotpLogin` that could exceed the frontend's request-abort timeout under load. Appearance and Clinic/Branding tabs stay out of scope (Clinic tab is `REQ002`'s, Appearance was recommended out).

## Requirement

- [REQ005 — Settings Backend Requirements](../../requirements/settings/requirement/REQ005-settings-2026-08-20-account-profile-and-notifications-backend.md) — done, updated 2026-08-21

## Implementation plan

- [PLAN010 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../implementation-plans/settings/requirement/PLAN010-settings-2026-08-20-profile-password-sessions-notifications.md) — done
- [PLAN016 — Profile fields, Avatar upload, real 2FA](../../implementation-plans/settings/requirement/PLAN016-settings-2026-08-21-profile-fields-avatar-2fa.md) — done

## Test plan

- [TP040 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../test-plans/settings/requirement/TP040-settings-2026-08-20-profile-password-sessions-notifications.md) — approved
- [TP045 — Profile DOB/Gender/Bio/Address, avatar upload, real TOTP 2FA](../../test-plans/settings/requirement/TP045-settings-2026-08-21-profile-fields-avatar-2fa.md) — approved

## Test results

- [TR039 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../test-results/settings/requirement/TR039-settings-2026-08-20-profile-password-sessions-notifications.md) — passed
- [TR044 — Profile DOB/Gender/Bio/Address, avatar upload, real TOTP 2FA](../../test-results/settings/requirement/TR044-settings-2026-08-21-profile-fields-avatar-2fa.md) — passed

## Related

- [REQ002 — Organization Branding & Management](../../requirements/organization-branding/requirement/organization-branding-and-management-requirements.md) — covers the Clinic tab's branding scope; not duplicated here.
