---
feature: security
date: 2026-08-22
ids: [REQ015]
status: in-progress
---

# security — 2026-08-22

Derived from the CareOS PRD's §8 (RBAC & Permission Model) and M2 (Identity, Authentication & Security), distinct from the `security-2026-08-21` bundle (`REQ012`, org-wide policy toggles). This is the RBAC-enforcement gap `project-plans` F-03 independently identified: `Permissions`/`RolePermissions` are real, populated tables that nothing reads to authorise anything, and the frontend's `hasPermission()` always returns `false`. Also scopes SSO, clinician-registry verification, API keys, break-glass access, and formal impersonation — none of which exist today.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet.

## Requirement

- [REQ015 — Identity platform extensions: custom-role enforcement, SSO, clinician verification, API keys](../../requirements/security/requirement/REQ015-security-2026-08-22-identity-platform-extensions.md) — draft

## Related

- [security-2026-08-21 bundle](../security-2026-08-21/manifest.md) — REQ012, the org-wide security-policy toggles this requirement's permission-enforcement work is distinct from but complementary to.
- [security-2026-08-17 bundle](../security-2026-08-17/manifest.md) — REQ001, the original master security-requirements document this requirement is a child of.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
