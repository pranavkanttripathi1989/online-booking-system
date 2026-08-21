---
id: REQ005
type: requirement
feature: settings
created: 2026-08-20
updated: 2026-08-21
status: done
parent: null
related: [PLAN010, TP040, TR039, PLAN016, TP045, TR044]
---

# Settings — Backend Requirements (Profile / Account & Security / Notifications)

**Progress (2026-08-21, closed):** Profile, Password change, Sessions list/revoke, Deactivate account, and Notification-preferences storage were shipped first — `PLAN010`, tested (`TP040` approved, `TR039` passed). This session closed the remaining gap: Bio/DOB/Gender/structured-India-address + avatar upload on Profile, and real TOTP 2FA (enrollment, QR, single-use backup codes, a `LoginResult` GraphQL union so the existing `AuthPayloadType` "hard contract" stayed non-nullable) — `PLAN016`, tested (`TP045` approved, `TR044` passed). Open Question 1 (2FA real-or-defer) was resolved by explicit user direction mid-session: build real TOTP now, not the smaller remove/hide option. Open Question 3 (Bio/avatar fields, storage approach) resolved: local filesystem storage under `backend/uploads/avatars/`, since no AWS credentials exist in this environment to build against S3 for real — a documented swap path is left in `account.controller.ts`'s header comment. The notification-trigger pipeline (`context/open-questions.md` #5) was closed under `REQ008`, not this requirement. Appearance stays correctly scoped out of the backend per this doc's own recommendation below (client-only/localStorage, pending a product decision on whether cross-device sync is ever needed). The Clinic tab's branding sub-feature is `REQ002`'s separate scope, not this requirement's — and `REQ002` itself is still `approved`, not implemented.

**Why this exists (original, 2026-08-20):** `frontend/src/pages/settings/index.jsx` (route `/settings`, 481 lines, 5 tabs) is 100% mock — zero real `useQuery`/`gql` reference anywhere in the file (confirmed by direct grep, not assumed). Every field across every tab is local `useState`, backed by `mocks/store.js` or nothing at all.

## Scope — one requirement per tab, since they have genuinely different backend needs

### 1. Profile tab — likely mostly reuse, not new build
Fields: first name, last name, phone, bio, avatar. First/last name and phone almost certainly map onto the **already-built** `updateUser` mutation (`backend/src/users`, already consumed by `admin/users/form.jsx`) — check whether that mutation's `UserUpdateInput` already covers a self-service update path (it was built for an *admin* editing *another* user; confirm it's safe/correct for a user editing *themself*, and that it's reachable without `admin`/`super_admin` role gating, which it currently has per `@Auth('admin', 'super_admin')` on `updateUser`). `bio` and `avatar` upload are not on `AdminUserType` today — need new fields or confirm scope (avatar upload specifically needs the file-upload validation `requirements/security-requirements.md` §4 already calls out: server-side MIME/size validation, never client-`accept`-only).

### 2. Account & Security tab — mostly new build, but with a real backend primitive already available
- **Change password** (self-service, authenticated) — no such mutation exists today; `auth` module has password *reset* (OTP-driven, for a logged-out user), not an authenticated "change my own password" flow. New mutation needed.
- **Active sessions list + revoke** — `auth.service.ts` already tracks a Redis set of refresh tokens per user (`auth:user:${userId}:refresh_tokens`, used for the existing "logout everywhere" `logout` mutation). A sessions UI is very likely a thin read/revoke layer over infrastructure that **already exists** — confirm in the implementation plan before assuming new backend work is needed here.
- **2FA toggle** — currently a bare local boolean with no real enrollment flow (QR code, backup codes, verification step). Real 2FA is a substantial feature in its own right; flag for a scope decision (build a real TOTP flow vs. defer).
- **Deactivate account** — needs a real mutation; check whether this should reuse the same soft-delete pattern other domains use (`is_deleted`/`is_active` flags already established project-wide) rather than inventing a new one.

### 3. Notifications tab — preferences, likely new, small
A `NOTIF_ROWS`-shaped preference set (which events trigger in-app/email notification) — no matching backend model today. Small, self-contained; check whether `UserProfiles` gets new preference columns or a dedicated `NotificationPreferences` table (matches the DB-normalization precedent already set project-wide — a bare JSON blob would be the wrong pattern here given the schema's own conventions).

### 4. Appearance tab — likely no backend needed at all
Font size, accent color, theme mode, compact density, RTL, language — this is presentation-only client state. **Recommend explicitly scoping this OUT of backend work** — persisting it (if wanted at all) is a `localStorage` concern, not a GraphQL one, unless there's a real cross-device-sync requirement nobody has stated. Flag as a decision, don't silently build a backend for it.

### 5. Clinic tab (branding) — do not re-specify, cross-reference instead
This tab's branding sub-feature (`getOrganizationBranding`/`updateOrganizationBranding` in the mock) is **already fully specified** in `requirements/organization-branding/requirement/organization-branding-and-management-requirements.md` (`REQ002`). This requirement doesn't duplicate that scope — implementation work for the Clinic tab should be planned against `REQ002`, not this document. The rest of the Clinic tab (if it has fields beyond branding — needs a closer read during the implementation-plan pass) is in scope here only for whatever isn't already covered by `REQ002`.

## Constraints (from CLAUDE.md, restated for this domain)

- Multi-tenancy: every mutation here is inherently self-scoped (a user editing their own profile/password/notifications) rather than org-scoped, but still needs the same JWT-derived-identity discipline as every other domain — never trust a client-supplied user id, always operate on `req.user`'s own identity from the token.
- Match the existing contract (hard rule 7): don't invent new field names for Profile-tab data that already exists on `AdminUserType`/`UserUpdateInput` — extend, don't duplicate.

## Open questions

1. ~~Is 2FA a real requirement for this release...~~ **Resolved 2026-08-21**: build real TOTP now (explicit user direction, not the smaller remove/hide option). Shipped under `PLAN016`.
2. Does "Appearance" need any server-side persistence at all, or is `localStorage` sufficient? Needs a product decision, not an engineering guess. **Still open** — out of this requirement's closed scope.
3. ~~Bio/avatar fields on Profile...~~ **Resolved 2026-08-21**: local filesystem storage (`backend/uploads/avatars/`), no AWS credentials exist in this environment for S3; swap path documented in `account.controller.ts`. Shipped under `PLAN016`.

## Acceptance criteria (high-level)

- Profile edits (name, phone) persist via the real (possibly re-scoped) `updateUser` path and survive a page reload.
- Password change works against a real, validated, authenticated mutation — old password required, new password meets the same complexity rules already enforced at registration.
- Sessions list shows real active sessions from the existing Redis-backed refresh-token set; revoking one actually invalidates that specific session, not all of them (unless explicitly "log out everywhere").
- Notification preferences persist and are read by whatever code path actually decides to send a notification (cross-check against the `notifications` domain's existing send logic so this isn't a preference nobody reads).
