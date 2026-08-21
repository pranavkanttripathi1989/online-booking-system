---
id: TP049
type: improvement
feature: communications-policies
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ011
related: [PLAN020]
---

# Test plan — Notification Templates real backend (REQ011/PLAN020)

## Unit tests

`backend/src/email-templates/email-templates.service.spec.ts` (2 new cases): `update` persists `is_active` when provided, alongside the required `subject`/`body`; `update` leaves `is_active` untouched when omitted (the existing subject/body-only edit path used by `admin/EmailTemplates.jsx` stays unaffected).

## Live e2e verification (real backend, Playwright/Chromium)

1. Notification Templates tab shows the 5 real seeded rows (Appointment Confirmation/Reminder/Cancellation, Password Reset, Welcome Email) — not the old mock's 6 fabricated rows.
2. Toggling a template off persists to the DB (`is_active=false`, confirmed via `psql`), toggling it back on restores `is_active=true`.
3. Preview dialog shows the real, stored subject/body for the clicked template.
4. Edit icon navigates to `/admin/email-templates`.

## Browser e2e (Playwright)

`frontend/e2e/admin-policies-communications.spec.js`, extended: logs in as Admin (the mutation is admin/super_admin-only), confirms real template names render, toggles Appointment Confirmation off then back on with a reload in between to confirm real persistence, opens the preview dialog and confirms it shows real `{{token}}`-bearing body content.

## Responsive check

360px/768px/1280px — template cards and the preview dialog render cleanly, no overflow.
