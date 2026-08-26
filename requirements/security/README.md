# security

## requirement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ015 | requirement | Identity platform extensions: custom-role enforcement, SSO, clinician verification, API keys | in-progress | 2026-08-22 | 2026-08-24 | REQ001 | [REQ015-security-2026-08-22-identity-platform-extensions.md](./requirement/REQ015-security-2026-08-22-identity-platform-extensions.md) |
| REQ012 | requirement | Org-level Security & Privacy: real enforcement (not just persisted toggles) | done | 2026-08-21 | 2026-08-21 | — | [REQ012-security-2026-08-21-org-security-privacy-enforcement.md](./requirement/REQ012-security-2026-08-21-org-security-privacy-enforcement.md) |
| REQ001 | requirement | Security Requirements — MediBook/HealthSync Backend | approved | 2026-08-17 | 2026-08-17 | — | [security-requirements.md](./requirement/security-requirements.md) |
| REQ049 | requirement | A real PermissionsGuard enforcing the stored role/permission rows | done | 2026-08-23 | 2026-08-23 | REQ015 | [REQ049-security-2026-08-23-permissions-guard-enforcement.md](./requirement/REQ049-security-2026-08-23-permissions-guard-enforcement.md) |

## improvement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ145 | improvement | Auth tokens out of `localStorage` (SEC-2) | done | 2026-08-27 | 2026-08-27 | — | [REQ145-security-2026-08-27-auth-tokens-out-of-localstorage.md](./improvement/REQ145-security-2026-08-27-auth-tokens-out-of-localstorage.md) |
| REQ114 | improvement | Wire OTP-login SMS to the real per-org provider registry | done | 2026-08-26 | 2026-08-26 | — | [REQ114-security-2026-08-26-otp-login-real-sms-send.md](./improvement/REQ114-security-2026-08-26-otp-login-real-sms-send.md) |
| REQ060 | improvement | Clinician verification UI | done | 2026-08-25 | 2026-08-25 | REQ015 | [REQ060-security-2026-08-25-clinician-verification-ui.md](./improvement/REQ060-security-2026-08-25-clinician-verification-ui.md) |
| REQ053 | improvement | Break-glass emergency access + support impersonation audit trail | done | 2026-08-25 | 2026-08-25 | REQ015 | [REQ053-security-2026-08-25-break-glass-and-impersonation.md](./improvement/REQ053-security-2026-08-25-break-glass-and-impersonation.md) |

## bug

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| BUG026 | bug | `updateRolePermissions` could strip a system role's permissions; `getAuditLogs` unscoped | done | 2026-08-26 | 2026-08-26 | — | [BUG026-security-2026-08-26-role-permission-mutation-guards.md](./bug/BUG026-security-2026-08-26-role-permission-mutation-guards.md) |
| BUG022 | bug | The password-reset flow has no second step | done | 2026-08-25 | 2026-08-25 | — | [BUG022-security-2026-08-25-password-reset-flow-has-no-second-step.md](./bug/BUG022-security-2026-08-25-password-reset-flow-has-no-second-step.md) |
| BUG006 | bug | The F-01 "org-less caller sees everything" pattern survived in twelve more services | done | 2026-08-22 | 2026-08-22 | BUG004 | [BUG006-security-2026-08-22-org-less-caller-leaks-in-nine-services.md](./bug/BUG006-security-2026-08-22-org-less-caller-leaks-in-nine-services.md) |
| BUG004 | bug | Public registration mints org-less accounts that read every tenant (F-01) | done | 2026-08-22 | 2026-08-22 | — | [BUG004-security-2026-08-22-tenant-scoping-org-less-caller-sees-everything.md](./bug/BUG004-security-2026-08-22-tenant-scoping-org-less-caller-sees-everything.md) |
| BUG003 | bug | Frontend client-side authentication and role bypass (F-02) | done | 2026-08-22 | 2026-08-22 | — | [BUG003-security-2026-08-22-frontend-mock-auth-bypass.md](./bug/BUG003-security-2026-08-22-frontend-mock-auth-bypass.md) |
| BUG002 | bug | Live backend was signing JWTs with a guessable placeholder secret; four other real secrets never reached the container | done | 2026-08-22 | 2026-08-22 | — | [BUG002-security-2026-08-22-live-guessable-jwt-secret-and-unset-container-secrets.md](./bug/BUG002-security-2026-08-22-live-guessable-jwt-secret-and-unset-container-secrets.md) |

