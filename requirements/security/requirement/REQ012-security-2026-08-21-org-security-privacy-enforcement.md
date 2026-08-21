---
id: REQ012
type: requirement
feature: security
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN021, TP050, TR049]
---

**Closed 2026-08-21** (`PLAN021`, tested `TP050` approved / `TR049` passed): real enforcement built for all 5 toggles on `admin/Policies.jsx`'s Security & Privacy tab — org-wide MFA requirement, idle-timeout auto-logout, audit logging, patient data export (GDPR Art. 20), and a manager-panel IP whitelist. Closes Priority 2's "admin Security settings tab (not started, possible duplication with REQ005)" gap and implements concrete items from `REQ001`'s OWASP-grounded checklist (§2 account lockout/session controls, §6 audit logging + DPDP compliance) rather than leaving them as an aspirational doc.

# Org-level Security & Privacy: real enforcement (not just persisted toggles)

**Why this exists:** `admin/Policies.jsx`'s Security & Privacy tab existed only as a `SECURITY` local array with no backend — flipping a switch changed nothing. When asked to scope this out, the user explicitly chose the largest option offered (build real enforcement for all 5 toggles, not just persist them as inert settings) over the cheaper "persist only" alternative — this requirement documents and delivers that choice.

## Scope

Six new `ClientOrganizations` columns (`mfa_required`, `session_timeout_minutes`, `audit_log_enabled`, `patient_data_export_enabled`, `ip_whitelist_enabled`, `ip_whitelist`), each with a real enforcement mechanism, not just a stored flag:

1. **Require MFA for all staff.** A user who can't complete login has no way to reach the TOTP enrollment screen — so login is never blocked. Instead, a successful `AuthPayload`/`verifyTotpLogin` response carries `mfa_setup_required: true` (org requires it, caller is non-patient, caller hasn't enrolled yet) and the frontend redirects straight to Settings → Account & Security with a banner, instead of the normal post-login destination.
2. **Auto-logout after N min idle.** `session_timeout_minutes` rides on the same login response, stored alongside the token; a real idle-activity listener (mousemove/mousedown/keydown/touchstart/scroll) resets a client-side timer and calls `logout()` on expiry — distinct from the JWT's own fixed access/refresh TTLs.
3. **Enable audit logging.** A global `AuditLogInterceptor` (registered as `APP_INTERCEPTOR`, after the 3 existing `APP_GUARD`s) writes every mutation to the pre-existing `AuditLogs` table — the same table `admin/users/index.jsx`'s pre-existing "Audit Logs" tab already reads via `getAuditLogs`. Gated per-org; an org-less (platform-wide) caller is always logged regardless of the setting, since there's no org row to check.
4. **Allow patient data export.** GDPR Article 20 (data portability) — a patient can download their own profile + appointments + test results as JSON from Settings → Account & Security, gated on this org setting.
5. **IP whitelist for managers.** CIDR-aware IPv4 allow-list restricting manager-role access, with an explicit self-lockout exemption: the security-settings-update mutation itself is always allowed regardless of the caller's IP, so a mistake in the list can never permanently lock an org out.

## Constraints (from CLAUDE.md)

- Multi-tenancy: every check is scoped off `req.user.client_org_id` from the JWT, never a client-supplied org id (hard rule 6).
- Match the existing contract: `admin/Policies.jsx` had no pre-existing `gql` for this tab (100% mock array) — the contract was designed fresh here, following the codebase's established `{success, userErrors}` mutation-response convention already used elsewhere in `org-settings`.
- Fail closed: an unlinked patient account (`patient_id: null`) gets `myDataExport: null`, never falls through to someone else's data.

## Acceptance criteria

- Toggling "Require MFA for all staff" and logging in as an unenrolled staff account redirects to the 2FA enrollment screen instead of the normal dashboard; a patient login is unaffected by the same org setting.
- Toggling "Enable audit logging" and performing a real mutation produces a real row visible on `admin/users/index.jsx`'s existing Audit Logs tab.
- A patient can download a real JSON export of their own data when the org has enabled it; the query returns `null` (with a clear frontend message) when the org hasn't, or the account isn't linked to a Patients row.
- Enabling the IP whitelist with an address that excludes the caller's own IP still allows that same caller to save the security-settings page (self-lockout impossible) while a normal manager-role mutation from the same session is rejected.
- Cross-tenant isolation: an org's security settings are never readable or writable by another org's caller — explicit rejection test per hard rule 6.
