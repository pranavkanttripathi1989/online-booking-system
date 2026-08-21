---
id: REQ011
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN020, TP049, TR048]
---

# admin/Communications.jsx — Notification Templates tab against the real backend

**Why this exists:** the "Notification Templates" tab was CLAUDE.md's last remaining 100% mock surface in the Communications/Policies area — `EMAIL_TEMPLATES` was a hardcoded local array (6 fabricated rows including "24-Hour Reminder", "Follow-up Survey", "Video Call Reminder", none of which correspond to any real backend row), with a `toggle()` that only ever mutated local state. `backend/src/email-templates` already exists and already powers a separate, fully-functional page (`admin/EmailTemplates.jsx`, `/admin/email-templates`) — this was a pure wiring gap on the Communications page specifically, the same category CLAUDE.md's Hard Rule 8 calls out.

## Scope

- Replaced the hardcoded array with the real `emailTemplates` query (same one `admin/EmailTemplates.jsx` uses).
- Dropped the mock's fabricated `channel`/`email+sms` distinction — no such concept exists on the real `EmailTemplates` model; every row is an email template, full stop.
- Active/inactive toggle now writes through a real mutation. `UpdateEmailTemplateInput` (backend) previously only accepted `{subject, body}` — extended with an optional `is_active` field so this toggle has something real to call.
- Preview icon shows the real subject/body in a read-only dialog.
- Edit icon navigates to `/admin/email-templates` for full subject/body editing, rather than duplicating that editor's form inside this tab — one real editor, not two copies that could drift.

## Explicitly not built

- A second, parallel subject/body editor inside this tab — `admin/EmailTemplates.jsx` already owns that, matching this session's earlier "redirect, don't duplicate" decision for the Cancellation Policy sliders (`REQ010`).
- Any SMS-template concept — `EmailTemplates` is email-only; SMS message content in this app is either a fixed OTP string (`auth.service.ts`) or the notification message text built at dispatch time (`NotificationTriggerService`), neither of which is a stored, editable "template" today.

## Acceptance criteria

- The tab shows real, seeded template rows — not the old fabricated names.
- Toggling active/inactive persists to the database and survives a reload.
- Preview shows the real stored subject/body.
