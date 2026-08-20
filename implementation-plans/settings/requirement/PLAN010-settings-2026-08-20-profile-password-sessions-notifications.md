---
id: PLAN010
type: requirement
feature: settings
created: 2026-08-20
updated: 2026-08-20
status: done
parent: REQ005
related: []
---

# Implementation plan — Profile, Password, Sessions, Deactivate, Notification Preferences (REQ005)

Full plan approved via plan mode before implementation — see the approved plan content below (reproduced from `/Users/pranavkanttripathi/.claude/plans/fizzy-wobbling-catmull.md`, which is a local Claude Code artifact, not part of the repo).

## Scope

Unlike REQ006's cancellation-rules (which had a pre-existing frontend `gql` contract to match), `settings/index.jsx` was 100% mock with zero real GraphQL anywhere — this plan designed the contract itself, following established conventions (JWT-derived self-scoping, `{success, userErrors[, entity]}` for entity mutations, `GenericResultType` for boolean-ish ones).

Two findings that redirected scope from REQ005's original description:

1. `updateUser` (`backend/src/users`) could not be reused for self-service — it's admin-gated, takes an arbitrary `id`, and its input includes `role_ids`/`isActive`/`password`. Loosening its auth would be a direct IDOR. Built a separate, narrowly self-scoped path instead.
2. No notification-send pipeline exists anywhere in the codebase (`NotificationsService.create()` has zero callers; no real email/SMS infra beyond an OTP-SMS stub). Preferences are now real, persisted storage — but nothing reads them to decide whether to actually send anything. Logged as a new `context/open-questions.md` entry rather than building an inert-looking integration.

Profile scope trimmed to REQ005's own stated acceptance criteria exactly (first/last name + phone) — DOB/Gender/Address/Bio/Avatar fields stay client-only (unchanged), also logged as a new open-question addendum, since they have no backing schema and weren't in the acceptance criteria.

## What was built

**Schema**: `NotificationEventType` enum + `NotificationPreferences` model (`user_id`, `event_type`, three booleans, `@@unique([user_id, event_type])`) — migration `20260820130000_notification_preferences`.

**New module `backend/src/account/`**: `myProfile`/`updateMyProfile` (phone-uniqueness pre-checked before hitting Prisma, mirroring the Staff fix from earlier this session), `changeMyPassword` (reuses `RegisterInput`'s password-complexity regex and `auth.service.ts`'s bcrypt/cost-12 pattern), `mySessions`/`revokeMySession`, `deactivateMyAccount` (reuses `AuthService.logout()` via DI on `AuthModule`, not duplicated).

**Additive-only touch to `backend/src/auth/`**: `issueTokens()` gained an optional trailing `userAgent` param; when present, writes a new `auth:refresh_meta:${token}` Redis key (device + issued-at) alongside the existing, untouched `auth:refresh:${token}` key. `login`/`register`/`refresh`/`verifyOtp` thread it through from `@Context()`'s request headers. Zero change to existing behavior when the param is omitted — confirmed via the full pre-existing `auth.service.spec.ts` (22 tests) staying green.

Session `id` exposed to the client is a SHA-256 fingerprint of the refresh token, never the raw token. No fake "location" (no geo-IP infra) or "current session" badge (the frontend doesn't retain its own refresh token to self-identify) — dropped from the UI rather than fabricated.

**New module `backend/src/notification-preferences/`**: `myNotificationPreferences` (lazily seeds 7 default rows matching `NOTIF_ROWS`' hardcoded defaults on first read), `updateMyNotificationPreferences` (bulk upsert).

**Frontend (`frontend/src/pages/settings/index.jsx`)**: Profile/Account & Security/Notifications tabs rewired off local-only state onto the six new operations above. `AuthContext.jsx` gained a small `updateUser(patch)` action (mirrors the existing `login`/`logout` action pattern) so a profile-name edit reflects in the header without a re-login. Sessions UI drops the `location`/`current` fields entirely rather than showing fake data. Left untouched: 2FA toggle, Appearance tab, Clinic/Branding tab (tracked under `REQ002`), Profile's DOB/Gender/Address/Avatar fields.

## Verification

See [TP040](../../../test-plans/settings/requirement/TP040-settings-2026-08-20-profile-password-sessions-notifications.md) and [TR039](../../../test-results/settings/requirement/TR039-settings-2026-08-20-profile-password-sessions-notifications.md).
