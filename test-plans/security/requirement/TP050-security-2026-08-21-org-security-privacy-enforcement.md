---
id: TP050
type: requirement
feature: security
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ012
related: [PLAN021]
---

# Test plan — org Security & Privacy real enforcement (REQ012/PLAN021)

## Unit tests

`backend/src/org-settings/org-settings.service.spec.ts` (extended): `mySecuritySettings` returns `null` for a platform-wide (org-less) caller rather than leaking any org's data; `updateMySecuritySettings` rejects an org-less caller with a clear error and performs no write; an explicit `session_timeout_minutes: null` clears the stored value while omitting the field entirely leaves the previously-stored value untouched (two distinct test cases, not one).

`backend/src/auth/auth.service.spec.ts` (extended): `mfa_setup_required` is `true` only when the org requires MFA, the caller's role isn't `patient`, and the caller hasn't already enrolled TOTP; `false` in every other combination (org doesn't require it / caller is a patient / caller already enrolled); `session_timeout_minutes` on the login response matches the org's stored value or is absent when unset; an org-less caller never throws and gets `mfa_setup_required: false`.

`backend/src/common/interceptors/audit-log.interceptor.spec.ts` (new): a GraphQL query (not a mutation) is never logged; an org-less caller is always logged regardless of the org setting (no org row to gate on); an org with `audit_log_enabled: false` skips the write; an org with it `true` writes a real `AuditLogs` row with actor/action/resource; a mutation that itself throws is still logged (the audit write happens independently of the mutation's outcome); a failure inside the audit-log write itself never propagates and breaks the real mutation it's observing; an unrecognized field name still gets a sane fallback action/resource rather than crashing.

`backend/src/common/guards/ip-whitelist.guard.spec.ts` (new): an exact-IP match on the list is allowed; a CIDR-range match is allowed; a non-matching IP is rejected with `ForbiddenException`; an empty/unset list fails open (never blocks); a non-manager role (patient/clinician/admin) is unaffected by the org's whitelist entirely; `myOrgSecuritySettings`/`updateMyOrgSecuritySettings` are exempt regardless of the caller's IP (the self-lockout guarantee); a `::ffff:`-prefixed IPv6-mapped-IPv4 address is correctly normalized before matching.

`backend/src/account/account.service.spec.ts` (extended, `myDataExport` describe block): returns `null` for an unlinked account (`patient_id: null`); returns `null` when the org hasn't enabled export; returns `null` for a soft-deleted `Patients` row; a cross-org `client_org_id` never leaks another org's patient; the happy path returns a JSON string containing real profile/appointments/test-results data scoped to exactly that one patient.

## Live e2e verification (real backend, curl + Chrome DevTools)

1. As `manager@medibook.dev`: toggle `mfa_required` on via `updateMyOrgSecuritySettings`, log in as the same (unenrolled) manager account through the real UI, confirm the login redirects to `/settings` with the Account & Security tab pre-selected and the MFA-required warning banner visible — not the normal `/manager/dashboard` destination.
2. As `patient@medibook.dev`: same org, `mfa_required` still on — confirm login goes to the normal `/patient/dashboard`, proving the MFA requirement correctly excludes patients.
3. Self-lockout exemption: enable `ip_whitelist_enabled` with a CIDR that excludes the test caller's real IP; confirm a normal manager-role mutation is rejected with 403; confirm `updateMyOrgSecuritySettings` itself still succeeds from the same (excluded) IP; whitelist the real network; confirm the normal mutation succeeds again.
4. Patient data export: temporarily link a demo patient account's `patient_id` to a real `Patients` row with real appointments, enable `patient_data_export_enabled`, click "Download My Data" in the real UI, confirm the downloaded JSON contains real appointment data scoped to that patient; revert the temporary DB link afterward.
5. Audit logging: enable `audit_log_enabled`, perform a real mutation (a security-settings save), confirm a new row appears via `admin/users/index.jsx`'s pre-existing Audit Logs tab — proving the interceptor writes to the same table that tab already reads, not a parallel, disconnected log.

## Browser e2e (Playwright)

`frontend/e2e/security-privacy.spec.js` (new, serial — all tests share one org's security-settings row): manager loads/saves/reverts the 5 toggles against the real backend; the IP whitelist textarea appears only when its toggle is on and its value persists across a reload; a patient sees the "Your Data" section and gets a clear, real error when export isn't available (the demo patient account is deliberately unlinked, so this exercises the real `null` path, not the populated-export path — covered by the unit test's linked-patient fixture instead); a manager/admin never sees the patient-only "Your Data" section at all.

## Responsive check

360px/768px/1280px, live Playwright screenshots: `admin/Policies.jsx`'s Security & Privacy tab (5 switches + conditional IP-whitelist card) and `settings/index.jsx`'s new "Your Data" section — zero horizontal overflow, conditional card renders correctly at every breakpoint.
