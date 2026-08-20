---
id: TP040
type: requirement
feature: settings
created: 2026-08-20
updated: 2026-08-20
status: approved
parent: REQ005
related: [PLAN010]
---

# Test plan — Profile, Password, Sessions, Deactivate, Notification Preferences (REQ005/PLAN010)

Written and executed together against the already-approved implementation plan, same pattern as TP039 for REQ006.

## Unit tests

`backend/src/account/account.service.spec.ts` (14 cases): profile derived exclusively from JWT subject never a client-supplied id; deleted profile returns null rather than leaking; phone-uniqueness collision on update rejected cleanly; own-phone-unchanged allowed; name/phone update scoped to caller's own row; wrong current password rejected on `changeMyPassword`; correct current password hashes and stores the new one; `mySessions` only reads the caller's own Redis session set; a session with no recorded metadata shows as unknown rather than fabricated; real metadata round-trips correctly; a revoke attempt against a fingerprint not in the caller's own set is rejected (cross-user isolation); a real owned session revokes correctly; `deactivateMyAccount` deactivates the caller's own row and calls `AuthService.logout` for that same id; never accepts another user's id.

`backend/src/notification-preferences/notification-preferences.service.spec.ts` (4 cases): existing rows returned without reseeding; first-read lazily seeds all 7 defaults matching `NOTIF_ROWS`; bulk upsert scoped to the caller's own `user_id`; DB error returns `{success:false}` rather than throwing.

## Live e2e verification (real backend, authenticated GraphQL, `manager@medibook.dev`)

1. `myProfile` returns real seeded data.
2. `updateMyProfile` round-trips a name change and reverts it.
3. `mySessions`/`revokeMySession`: bogus fingerprint rejected cleanly; a real session (logged in with a real `User-Agent` header) revokes correctly and disappears from the list; accumulated stale dev-testing sessions correctly show `device`/`created_at` as `null` (no fabricated data) rather than a fake value.
4. `changeMyPassword`: wrong current password rejected; correct one changes the password, confirmed by logging in with the new password against a throwaway registered test account (not a shared demo account).
5. `deactivateMyAccount`: throwaway test account deactivated, confirmed a subsequent login attempt is rejected.
6. `myNotificationPreferences`/`updateMyNotificationPreferences`: lazy defaults match `NOTIF_ROWS` exactly; round-trip verified.

## Browser e2e (Playwright, `frontend/e2e/settings-account.spec.js`)

- Profile tab loads real data (not the old hardcoded placeholder), saves an edit, persists across reload, reverted within the same test to avoid mutating the shared `manager@medibook.dev` account other specs depend on.
- Active Sessions tab shows real session data (a real captured `User-Agent`, not the old fake "Chrome on macOS"/"Mumbai, IN" mock).
- Notification preferences tab loads real defaults, persists a toggle across reload, reverted within the same test.
- Password change and account deactivation deliberately **not** exercised via the shared demo account in this browser suite (already covered via direct GraphQL against a throwaway account above) — mutating `manager@medibook.dev`'s password would break every other e2e spec that logs in as Manager.

## Responsive check

360px/768px/1280px, all three touched tabs (Profile, Account & Security, Notifications): zero horizontal overflow at any breakpoint (ad-hoc Playwright check, not committed as a permanent spec).

## Non-goals for this plan

2FA, Appearance persistence, avatar upload, Profile's DOB/Gender/Address fields, and wiring notification preferences into an actual send trigger — all logged in `context/open-questions.md`, not guessed at.
