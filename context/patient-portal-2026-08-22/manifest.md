---
feature: patient-portal
date: 2026-08-22
ids: [REQ027]
status: in-progress
---

# patient-portal — 2026-08-22

Derived from the CareOS PRD's M13. `pages/patient/Appointments.jsx` and `pages/patient/Profile.jsx` are named in `project-plans` F-18 as fabricated-data pages with a real backend sitting unused — that wiring fix is tracked in `project-plans/06` P2, not duplicated here. This requirement scopes the genuinely new capability: family profiles, ABHA management, installable PWA, refills, and multi-language UI (no i18n framework exists in the frontend today).

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ027 — see file for full title](../../requirements/patient-portal/requirement/REQ027-patient-portal-2026-08-22-pwa-records-and-family-profiles.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
