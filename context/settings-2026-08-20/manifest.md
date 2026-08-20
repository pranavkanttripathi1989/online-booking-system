---
feature: settings
date: 2026-08-20
ids: [REQ005]
status: draft
---

# settings — 2026-08-20

Requirement written, grounded in `settings/index.jsx`'s actual 5-tab structure (Profile, Account & Security, Notifications, Appearance, Clinic) and confirmed zero real GraphQL anywhere in the file. Split by tab since each needs genuinely different backend work — two tabs (Profile, sessions-list within Account & Security) look like they can mostly *reuse* already-built infrastructure (`updateUser`, the Redis-backed refresh-token set) rather than needing new backend from scratch. The Clinic tab is explicitly *not* re-specified here — it's cross-referenced to the existing `REQ002` (organization-branding), which already covers it. No implementation plan yet — three open questions (2FA real-or-remove, Appearance backend-or-localStorage, avatar storage approach) need a decision first.

## Requirement

- [REQ005 — Settings Backend Requirements](../../requirements/settings/requirement/REQ005-settings-2026-08-20-account-profile-and-notifications-backend.md) — draft, updated 2026-08-20

## Related

- [REQ002 — Organization Branding & Management](../../requirements/organization-branding/requirement/organization-branding-and-management-requirements.md) — covers the Clinic tab's branding scope; not duplicated here.
