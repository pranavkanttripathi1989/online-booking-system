---
id: TR045
type: requirement
feature: notifications
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ008
related: [PLAN017, TP046]
---

# Test result — Multi-provider OTP/SMS config + notification trigger pipeline (REQ008/PLAN017/TP046)

**Outcome: PASS.** Backend committed as `12b0a86` (trigger pipeline + provider registry), frontend wiring as `028d55d`, e2e specs + a validation-DTO fix found during this pass as `02cb1fa` — see `git log` for exact SHAs. The DTO validation fix itself landed as an amendment to `12b0a86`'s file (`notification-provider.entity.ts`) in the same working session before commit, so no separate fix commit exists for it — verified fixed and tested before `12b0a86` was created.

## Unit tests

`docker exec medibook_backend npm test` — full backend suite green: **46 suites / 542 tests**. New: `registry.spec.ts` (12 cases), `notification-provider-config.service.spec.ts` (14 cases), `notification-trigger.service.spec.ts` (9 cases), plus 2 new cases each in `appointments.service.spec.ts`, `messages.service.spec.ts` (extended existing assertion), `appointment-payments.service.spec.ts`.

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend, Playwright/Chromium)

Full manual pass documented in the session transcript, summarized here:

- As Manager: selected MSG91, entered real-shaped credentials (authkey/sender_id), saved, confirmed the row in `NotificationProviderConfig` via direct `psql` — `provider='msg91'`, `sender_id` in the clear, `credentials_encrypted` a non-empty opaque string (`length > 0` and not equal to the plaintext). Reload confirms `MSG91` selected, sender name shown, "Credentials configured" chip, credential fields blank.
- As Admin (org-less): the identical save flow correctly rejected with "Your account isn't associated with an organization" — confirms the multi-tenancy guard fires for a real platform-wide caller, not just an org-scoped one.

**One real backend bug found and fixed during this pass:** `UpdateNotificationProviderConfigInput` and `CredentialFieldInput` (`notification-provider.entity.ts`) declared `@Field()` GraphQL decorators but no `class-validator` decorators at all. The project's global `ValidationPipe` runs with `whitelist: true`, which strips (and with no other validator present, effectively rejects) any input property that isn't recognized by at least one class-validator decorator — every save failed with a generic `"Bad Request Exception"` / `"property X should not exist"` for every field, including nested array items inside `credentials`. Fixed by adding `@IsNotEmpty()`/`@IsOptional()`/`@IsString()` to the scalar fields and `@IsArray()`/`@ValidateNested({each: true})`/`@Type(() => CredentialFieldInput)` for the nested array. Reproduced via a live Playwright network trace (not guessed at), fixed, and re-verified live before this document was written.

## Browser e2e (Playwright)

`npx playwright test e2e/admin-communications-sms-provider.spec.js` — 2/2 passing, both standalone and combined with the other REQ005/REQ008 specs at `--workers=1`.

## Responsive check

360px/768px/1280px, live Playwright screenshots: `admin/Communications.jsx`'s Global Settings tab (Email Settings card unchanged, OTP/SMS Provider card new) — zero horizontal overflow at any breakpoint, dynamic credential fields wrap correctly on mobile.
