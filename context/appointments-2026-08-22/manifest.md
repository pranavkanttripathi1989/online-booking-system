---
feature: appointments
date: 2026-08-22
ids: [REQ018]
status: in-progress
---

# appointments — 2026-08-22

Derived from the CareOS PRD's M5 (Booking Engine), distinct from the M4 scheduling-engine bundle (`REQ017`). The core `createAppointment` mutation and its state machine already align well with the PRD's own appointment lifecycle (`requested → confirmed → checked_in → in_consultation → completed`). Real gaps: no patient dedup/merge tooling, no family/dependant model, no embeddable booking widget, and no configurable intake-form builder.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet.

## Requirement

- [REQ018 — Booking engine: channels, dedup, family profiles, and no-show policy](../../requirements/appointments/requirement/REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md) — draft

## Related

- [scheduling-engine-2026-08-22 bundle](../scheduling-engine-2026-08-22/manifest.md) — REQ017, the calendar-engine dependency this booking module sits on top of.
- [appointments-2026-08-18 bundle](../appointments-2026-08-18/manifest.md) — the pre-existing test-coverage bundle for this same feature slug (REQ013/TP003/TR003), unrelated to this new PRD-derived scope.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
