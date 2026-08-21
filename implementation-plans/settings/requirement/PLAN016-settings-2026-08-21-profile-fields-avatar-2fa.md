---
id: PLAN016
type: requirement
feature: settings
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ005
related: [TP045, TR044]
---

# Implementation plan — Profile fields, Avatar upload, real 2FA (REQ005 remainder)

Closes REQ005's remaining open questions 1 and 3 (`context/open-questions.md` #4). Three separable slices, committed independently.

## Slice A — Profile fields (DOB, Gender, Address, Bio)

`UserProfiles` gets `date_of_birth DateTime?`, `gender String?`, `bio String?`, `address_structured Json?` — the last matching `Patients`/`ClientOrganizations`' exact `{line1, line2, city, state, pincode, country}` shape (the modern, actively-used convention project-wide), not the older unused flat `address_line1`/`postal_code`/no-`state` columns already on this table (confirmed via grep: those are never exposed in any GraphQL entity today, so there's no compatibility surface to preserve — adding a second, parallel flat set would just be inconsistent with itself).

`MyProfileType`/`UpdateMyProfileInput` extended with the four fields. `settings/index.jsx`'s Profile tab DOB/Gender/Bio/Address fields go from fully uncontrolled (`defaultValue` only, no `onChange`, not even local `useState`) to real controlled inputs wired into the existing `handleProfileSave` mutation. Address UI stays single-line (`line2` unset) — no product ask for a second address line.

## Slice B — Avatar upload

No AWS S3 credentials exist anywhere in this environment (confirmed: no `@aws-sdk/*` in `package.json`, no AWS env vars). Building against a real S3 bucket without credentials would mean fabricating the integration — the thing CLAUDE.md hard rule 9 explicitly rules out. Real, working alternative for now: local filesystem storage under `backend/uploads/avatars/`, served via a static Express route, matching the pattern's actual constraint (multer already exists in `node_modules` as an `@nestjs/platform-express` transitive dep — this makes it a first-class dependency instead) . `NotesForwardPort` comment left in the upload service pointing at the swap-to-S3-ap-south-1 path once credentials exist — one function to change, not a redesign.

New `uploadMyAvatar` mutation (multipart upload via `graphql-upload`... no — NestJS GraphQL code-first doesn't easily support file uploads through the same endpoint without extra wiring; simpler and equally real: a plain REST `POST /account/avatar` endpoint (multer, JWT-guarded same as every other authenticated route) returning the stored URL, which the frontend then saves via the existing `updateMyProfile` mutation's new `avatar_url` field. Matches how file upload is commonly split from the GraphQL layer in NestJS-GraphQL apps generally, and avoids inventing GraphQL-upload-scalar wiring for a single call site.

Server-side validation per `requirements/security-requirements.md` §4: MIME-type sniffed from file content (not just the client's declared `Content-Type`), size capped at 2MB (matching the frontend's existing copy), only jpeg/png/gif accepted.

## Slice C — Real 2FA (TOTP)

New npm deps: `otplib` (secret generation + verification, RFC 6238 standard, no external service calls) and `qrcode` (renders the enrollment QR server-side as a data URI — no new frontend dependency needed).

`UserProfiles` gets `totp_secret String?` (encrypted at rest — reuses the AES-256-GCM helper built for Slice D's SMS credentials, see `implementation-plans/notifications/requirement/PLAN017`), `totp_enabled Boolean @default(false)`, `totp_backup_codes Json?` (array of bcrypt-hashed one-time codes, matching how passwords are already hashed rather than stored plain).

Enrollment: `startTotpEnrollment` mutation generates a secret + QR data URI (not yet enabled). `confirmTotpEnrollment(code)` verifies one real code against the pending secret before flipping `totp_enabled: true` and returning 10 backup codes (shown once, hashed before storage). `disableTotp(password)` requires re-authentication, not just a toggle click.

Login flow change (`auth.service.ts`): after password verification, if `totp_enabled`, `login()` returns a challenge response (`requires_totp: true`, a short-lived signed challenge token) instead of full tokens. New `verifyTotpLogin(challengeToken, code)` mutation validates the code (or a backup code, single-use) and only then calls the existing `issueTokens`. `AuthPayloadType` gets the two new nullable fields — additive, not a breaking change to the existing shape `login.jsx` already reads.

## Testing

Slice A: `account.service.spec.ts` extended — new fields round-trip correctly, address JSON shape matches the established pattern. Slice B: new `account-upload` unit tests for MIME/size rejection, a live upload verified via curl. Slice C: `auth.service.spec.ts` extended — login returns a challenge (not tokens) when `totp_enabled`, `verifyTotpLogin` accepts a valid code/backup code and rejects an invalid one, a used backup code can't be reused. Full backend `npm test` green after each slice, committed separately.
