---
feature: analytics-reporting
date: 2026-08-22
ids: [REQ029]
status: in-progress
---

# analytics-reporting — 2026-08-22

Derived from the CareOS PRD's M15. Extends the already-real `analytics`/`dashboard` modules (built under `REQ007`) with the Patient report group, scheduled delivery, and a fix for the already-documented completion-rate utilisation proxy so it becomes true slot-capacity utilisation. Clinical/Pharmacy/Insurance report groups are blocked on their respective source-data modules and inherit those phases.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ029 — see file for full title](../../requirements/analytics-reporting/requirement/REQ029-analytics-reporting-2026-08-22-report-groups-and-scheduled-delivery.md) — draft

## Related

- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
