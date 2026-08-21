---
id: PLAN021
type: requirement
feature: security
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ012
related: [TP050, TR049]
---

# Implementation plan — org Security & Privacy real enforcement (REQ012)

## Schema

Six new columns on `ClientOrganizations` (not a separate model — these are single org-wide flags, unlike `NotificationProviderConfig`'s per-channel rows):

```
mfa_required                 Boolean  @default(false)
session_timeout_minutes      Int?
audit_log_enabled            Boolean  @default(false)
patient_data_export_enabled  Boolean  @default(false)
ip_whitelist_enabled         Boolean  @default(false)
ip_whitelist                 String?
```

Hand-written migration `20260821030000_org_security_settings` (`prisma migrate dev` can't run non-interactively in this environment — every schema change here ships as a reviewed SQL file per CLAUDE.md).

## `backend/src/org-settings/` extension

`OrgSecuritySettingsType`/`UpdateOrgSecuritySettingsInput` (all 6 fields optional; `session_timeout_minutes` nullable so an explicit `null` clears it while an omitted field leaves it untouched — verified with dedicated tests for both cases). `myOrgSecuritySettings`/`updateMyOrgSecuritySettings`, `@Auth('manager','admin','super_admin')`, matching this module's existing `{success, userErrors[, settings]}` convention. Org-less caller gets `null`/a clear rejection, never another org's row.

## `auth.service.ts` — `mfa_setup_required` / `session_timeout_minutes` on login

`AuthPayloadType` gains `mfa_setup_required: boolean` and `session_timeout_minutes?: number`. A new `loadSecurityFields(userProfile)` private method (one `clientOrganizations.findUnique` call, shared by both `login()` and `verifyTotpLogin()`): `mfa_setup_required = org.mfa_required && role !== 'patient' && !userProfile.totp_enabled`. Login itself is never blocked — a user who can't log in has no way to reach the enrollment screen — the frontend redirects post-login instead.

## `frontend/src/pages/auth/login.jsx` + `AuthContext.jsx`

`redirectAfterLogin(navigate, user, mfaSetupRequired)`: if `mfaSetupRequired`, `navigate('/settings', {state: {tab: 1, mfaSetupRequired: true}})` instead of the normal role-based post-login destination. `settings/index.jsx` reads `location.state` to pre-select the Account & Security tab and show a warning banner.

`AuthContext.login(token, user, rememberMe, sessionTimeoutMinutes)`: persists `medibook_session_timeout_minutes` alongside the token. A new idle-timer `useEffect`: real DOM activity listeners (mousemove/mousedown/keydown/touchstart/scroll) reset a `setTimeout` that calls `logout()` on expiry — only runs when the org actually set a timeout.

## `backend/src/common/interceptors/audit-log.interceptor.ts` (new)

`NestInterceptor`, registered as `APP_INTERCEPTOR` in `app.module.ts` (after the 3 existing `APP_GUARD`s — auth must resolve `req.user` before this can attribute a log entry). Only fires on GraphQL mutations (a `VERB_PATTERN` regex over the resolved field name infers action: create/update/delete/etc.). Writes to the pre-existing `AuditLogs` table — the same table `admin/users/index.jsx`'s pre-existing Audit Logs tab already reads via `getAuditLogs`, so "viewable on the Audit Log tab" in the new toggle's help text is accurate, not aspirational. Gated per-org (`audit_log_enabled`); an org-less caller is always logged (no org row to gate on). Uses RxJS `tap({next, error})` so a failed mutation is still logged, and the audit write itself never throws into (and breaks) the real mutation it's observing.

## `backend/src/common/guards/ip-whitelist.guard.ts` (new)

Registered as the 4th `APP_GUARD` (after `RolesGuard`). `isIpAllowed(ip, list)`: exact match plus CIDR bitmask matching, with `::ffff:`-prefix stripping for IPv6-mapped IPv4 addresses. Only applies to manager-role callers with `ip_whitelist_enabled` on. **`EXEMPT_FIELDS` allowlist** covers `myOrgSecuritySettings`/`updateMyOrgSecuritySettings` themselves — without this, a manager could type the wrong CIDR into the whitelist and permanently lock their own org out, since the very mutation needed to undo the mistake would itself be blocked by it. Fails open on an empty list (a toggle turned on with nothing entered yet doesn't lock everyone out by accident).

## `backend/src/account/` — `myDataExport`

`AccountService.myDataExport(user)`: returns `null` unless `patient_id` and `client_org_id` are both present, the org has `patient_data_export_enabled`, and the linked `Patients` row exists and isn't soft-deleted. Fetches patient/appointments/testResults via `Promise.all`, returns `JSON.stringify(..., null, 2)` as a plain GraphQL `String` (matching the existing `AuditLogs.details` precedent — no new custom scalar). Lives in `account` (self-service, `req.user`-scoped) not `patients` (staff/manager CRUD on other people's records), matching this module's existing convention.

## `frontend/src/pages/settings/index.jsx` — "Your Data"

New section in the Account & Security tab, gated on `user.roles` including `patient`, between Active Sessions and the Danger Zone. `handleDownloadData()`: `client.query(MY_DATA_EXPORT_QUERY, {fetchPolicy: 'network-only'})`, builds a `Blob`/object URL, triggers a real browser download. A `null` result shows a single honest "not available" message rather than guessing which of the two real reasons (org hasn't enabled it / account not linked) applies — the frontend can't distinguish them from a `null` and shouldn't fabricate a distinction.

## `frontend/src/pages/admin/Policies.jsx` — Security & Privacy tab

Replaces the old `SECURITY` local array with `GET_SECURITY_SETTINGS`/`UPDATE_SECURITY_SETTINGS` against the real resolvers above. 5 `Switch` components, a conditional "Allowed IP Addresses" `TextField` when the whitelist toggle is on, a save button. Help copy calls out the self-lockout exemption explicitly ("Saving this page is always allowed, even from a non-listed IP").

## Testing

`org-settings.service.spec.ts`: org-scoping, platform-wide-caller rejection, explicit-`null`-clears-vs-omitted-leaves-untouched for `session_timeout_minutes`. `audit-log.interceptor.spec.ts`: queries not logged, org-less always logged, org-off skips, org-on logs, failed mutations still logged, a broken audit write never breaks the real mutation, fallback action/resource naming for a non-matching field name. `ip-whitelist.guard.spec.ts`: exact-match and CIDR-match allow, non-matching IP rejected, empty list fails open, non-manager roles unaffected, `EXEMPT_FIELDS` bypass, `::ffff:`-prefix stripping. `account.service.spec.ts`: `myDataExport` — unlinked patient, org toggle off, soft-deleted patient, cross-org rejection, populated-data happy path.

## Verification

Full backend `npm test` green. Live curl verification of the self-lockout exemption end-to-end (whitelist a wrong IP → normal mutation blocked with 403 → security-settings mutation still succeeds → whitelist the real network → normal mutation succeeds again). Live Playwright verification of the MFA-redirect flow and the patient data-export download, both against the real backend. Playwright e2e spec (`frontend/e2e/security-privacy.spec.js`). Responsive check at 360/768/1280px. Commit.
