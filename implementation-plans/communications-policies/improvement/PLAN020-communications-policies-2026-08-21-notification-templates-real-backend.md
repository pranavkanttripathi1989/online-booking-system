---
id: PLAN020
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ011
related: [TP049, TR048]
---

# Implementation plan — Notification Templates real backend (REQ011)

## Backend

- `email-templates/dto/email-template.input.ts`: `UpdateEmailTemplateInput` gains an optional `is_active` field (`@IsOptional() @IsBoolean()`). `subject`/`body` stay required — the toggle path re-sends the row's existing values alongside the new `is_active`, rather than making them optional and complicating the existing `{{token}}`-validation logic in `update()`.
- `email-templates.service.ts`: `update()` now passes `is_active: input.is_active` through to the Prisma write (`undefined` when omitted, which Prisma/Jest's `toEqual` both treat as "field absent" — verified, not assumed).

## Frontend (`admin/Communications.jsx`)

- Replaced the hardcoded `EMAIL_TEMPLATES` array with a real `emailTemplates` query (`GET_EMAIL_TEMPLATES`), loaded on mount via the same `client.query(..., {fetchPolicy: 'network-only'})` pattern already used elsewhere on this page.
- `toggleTemplateActive()`: calls `updateEmailTemplate` with the row's current `subject`/`body` plus the flipped `is_active`; updates local state optimistically-but-only-after-success (post-mutation, not before).
- Dropped the fabricated `channel`/`CHANNEL_ICON` concept entirely — every card now shows a single, real "EMAIL" chip.
- "Trigger" column replaced with "Type", sourced from the real `type` field via a `TEMPLATE_TYPE_LABELS` lookup (same 8 entries as `admin/EmailTemplates.jsx`'s own `TYPE_LABELS`, kept as a small duplicated constant rather than a shared import — matches this codebase's existing convention of re-declaring small per-page lookups/validators rather than building a shared module for them).
- Preview icon opens a read-only dialog (same layout as `admin/EmailTemplates.jsx`'s own preview, not shared code — a small, simple dialog, not worth extracting for a single reuse).
- Edit icon navigates to `/admin/email-templates` (`useNavigate`) instead of duplicating the full editor form inside this tab.

## Verification

- New backend unit tests: `is_active` persists when provided; `is_active` stays untouched when omitted (existing subject/body-only path unaffected). Full backend suite reconfirmed green (46/46 suites, 552/552 tests).
- Live e2e verification (real backend, Playwright): real seeded template names render; toggling a template off/on persists across a reload, confirmed via direct `psql`; preview dialog shows the real stored subject/body; Edit icon navigates to the real Email Templates page.
- `frontend/e2e/admin-policies-communications.spec.js` extended with a new test (Admin role — `updateEmailTemplate` is admin/super_admin-only, unlike the two existing manager-scoped tests in this file).
- Responsive check at 360/768/1280px: clean, no overflow.
