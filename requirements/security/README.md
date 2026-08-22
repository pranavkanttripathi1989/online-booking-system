# security

## requirement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ015 | requirement | Identity platform extensions: custom-role enforcement, SSO, clinician verification, API keys | draft | 2026-08-22 | 2026-08-22 | REQ001 | [REQ015-security-2026-08-22-identity-platform-extensions.md](./requirement/REQ015-security-2026-08-22-identity-platform-extensions.md) |
| REQ012 | requirement | Org-level Security & Privacy: real enforcement (not just persisted toggles) | done | 2026-08-21 | 2026-08-21 | — | [REQ012-security-2026-08-21-org-security-privacy-enforcement.md](./requirement/REQ012-security-2026-08-21-org-security-privacy-enforcement.md) |
| REQ001 | requirement | Security Requirements — MediBook/HealthSync Backend | approved | 2026-08-17 | 2026-08-17 | — | [security-requirements.md](./requirement/security-requirements.md) |

## improvement

_none yet_

## bug

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| BUG004 | bug | Public registration mints org-less accounts that read every tenant (F-01) | done | 2026-08-22 | 2026-08-22 | — | [BUG004-security-2026-08-22-tenant-scoping-org-less-caller-sees-everything.md](./bug/BUG004-security-2026-08-22-tenant-scoping-org-less-caller-sees-everything.md) |
| BUG003 | bug | Frontend client-side authentication and role bypass (F-02) | done | 2026-08-22 | 2026-08-22 | — | [BUG003-security-2026-08-22-frontend-mock-auth-bypass.md](./bug/BUG003-security-2026-08-22-frontend-mock-auth-bypass.md) |
| BUG002 | bug | Live backend was signing JWTs with a guessable placeholder secret; four other real secrets never reached the container | done | 2026-08-22 | 2026-08-22 | — | [BUG002-security-2026-08-22-live-guessable-jwt-secret-and-unset-container-secrets.md](./bug/BUG002-security-2026-08-22-live-guessable-jwt-secret-and-unset-container-secrets.md) |

