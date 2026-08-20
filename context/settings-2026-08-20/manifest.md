---
feature: settings
date: 2026-08-20
ids: [REQ005, PLAN010, TP040, TR039]
status: in-progress
---

# settings — 2026-08-20

Requirement written, grounded in `settings/index.jsx`'s actual 5-tab structure (Profile, Account & Security, Notifications, Appearance, Clinic) and confirmed zero real GraphQL anywhere in the file.

Profile (name/phone only), Account & Security (password change, sessions list/revoke, deactivate), and Notifications preferences are now built, tested, and live-verified end-to-end (PLAN010/TP040/TR039) — see those docs for the two contract findings made mid-build: `updateUser` couldn't be safely reused for self-service (IDOR risk), and there is no notification-send pipeline anywhere in the codebase for the new preferences to plug into yet. Appearance and Clinic/Branding tabs stay out of scope (Clinic tab is `REQ002`'s, Appearance was recommended out); 2FA, avatar upload, and Profile's DOB/Gender/Address fields remain **not started**, now tracked as open questions #4 and #5 in `context/open-questions.md` rather than the informal 3-item list originally sketched in REQ005 — status stays `in-progress`, not `done`, until those are resolved.

## Requirement

- [REQ005 — Settings Backend Requirements](../../requirements/settings/requirement/REQ005-settings-2026-08-20-account-profile-and-notifications-backend.md) — draft, updated 2026-08-20

## Implementation plan

- [PLAN010 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../implementation-plans/settings/requirement/PLAN010-settings-2026-08-20-profile-password-sessions-notifications.md) — done

## Test plan

- [TP040 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../test-plans/settings/requirement/TP040-settings-2026-08-20-profile-password-sessions-notifications.md) — approved

## Test results

- [TR039 — Profile, Password, Sessions, Deactivate, Notification Preferences](../../test-results/settings/requirement/TR039-settings-2026-08-20-profile-password-sessions-notifications.md) — passed

## Related

- [REQ002 — Organization Branding & Management](../../requirements/organization-branding/requirement/organization-branding-and-management-requirements.md) — covers the Clinic tab's branding scope; not duplicated here.
