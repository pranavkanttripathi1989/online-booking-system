---
feature: communications-policies
date: 2026-08-20
ids: [REQ006]
status: draft
---

# communications-policies — 2026-08-20

Requirement written, grounded in `admin/Communications.jsx` (3 tabs, all mock) and `admin/Policies.jsx` (3 tabs; cancellation-rules tab already has real-looking inline `gql`, but direct check of `backend/src/schema.gql` confirmed none of those resolvers actually exist — only a read-only public-dialect type for the patient-facing booking flow). No implementation plan yet — blocked on two open questions about feature overlap (Communications' "Notification Templates" tab vs. the already-real `admin/EmailTemplates.jsx`; Policies' "Security settings" tab vs. `REQ005`'s Account & Security tab) that need resolving before backend work is scoped, to avoid building a duplicate of something that already exists or is already planned.

## Requirement

- [REQ006 — Communications & Policies — Backend Requirements](../../requirements/communications-policies/requirement/REQ006-communications-policies-2026-08-20-notification-config-and-cancellation-rules.md) — draft, updated 2026-08-20
