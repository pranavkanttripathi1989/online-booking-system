---
feature: security
date: 2026-08-21
ids: [REQ012, PLAN021, TP050, TR049]
status: done
---

# security — 2026-08-21

Closes Priority 2's "admin Security settings tab (not started, possible duplication with REQ005)" gap. `admin/Policies.jsx`'s Security & Privacy tab existed only as a local `SECURITY` array with zero backend — flipping a switch changed nothing. Offered a choice between persisting the 5 toggles as inert flags versus building real enforcement for all of them; the user explicitly chose the larger option.

Six new `ClientOrganizations` columns back five real mechanisms: **MFA-required** (login never blocks — a user who can't log in can't reach the enrollment screen — instead `mfa_setup_required: true` on the login response redirects the frontend straight to 2FA enrollment, explicitly excluding patients); **idle-timeout auto-logout** (`session_timeout_minutes` on login, a real client-side activity-listener timer, distinct from the JWT's own fixed TTLs); **audit logging** (new global `AuditLogInterceptor`, writing to the same `AuditLogs` table `admin/users/index.jsx`'s pre-existing Audit Logs tab already reads — confirmed by cross-checking both call sites against `prisma.auditLogs`, not assumed); **patient data export** (`myDataExport`, GDPR Article 20, a real JSON download from the patient's own Settings page); **IP whitelist for managers** (new `IpWhitelistGuard`, CIDR-aware, with an explicit `EXEMPT_FIELDS` self-lockout exemption for the security-settings mutation itself — live-verified end-to-end: wrong IP blocks a normal mutation, the settings-save mutation still succeeds, fixing the whitelist restores normal access).

No real backend bugs were found this pass (unlike several prior slices this session). One apparent bug during manual browser testing — a sidebar drawer seeming to open on every click at 360px — was investigated and confirmed to be a stale-DOM-reference artifact of the browser-automation tooling itself (MUI keeps drawer backdrop elements mounted-but-hidden after close, and a naive presence check misread that as "open"), not a real application defect.

## Requirement

- [REQ012 — Org-level Security & Privacy: real enforcement](../../requirements/security/requirement/REQ012-security-2026-08-21-org-security-privacy-enforcement.md) — done

## Implementation plan

- [PLAN021 — org Security & Privacy real enforcement](../../implementation-plans/security/requirement/PLAN021-security-2026-08-21-org-security-privacy-enforcement.md) — done

## Test plan

- [TP050 — org Security & Privacy real enforcement](../../test-plans/security/requirement/TP050-security-2026-08-21-org-security-privacy-enforcement.md) — approved

## Test results

- [TR049 — org Security & Privacy real enforcement](../../test-results/security/requirement/TR049-security-2026-08-21-org-security-privacy-enforcement.md) — passed

## Related

- [settings — 2026-08-20 bundle](../settings-2026-08-20/manifest.md) — the TOTP enrollment flow the MFA-required redirect sends users to, and the myProfile/myNotificationPreferences pattern `myDataExport` follows, were both built there (REQ005/PLAN010/PLAN016).
- [notifications — 2026-08-21 bundle](../notifications-2026-08-21/manifest.md) — the encrypted-credential-at-rest pattern (`secrets.ts`) this slice's audit/IP-whitelist work sits alongside was introduced there (REQ008/PLAN017).
- [communications-policies — 2026-08-20 bundle](../communications-policies-2026-08-20/manifest.md) — same `admin/Policies.jsx` file; that bundle's `context/open-questions.md` #7 (Cancellation Policy duplication) was resolved earlier this session by redirecting to Cancellation Rules, freeing up the Security & Privacy tab this bundle rebuilds.
