---
feature: pharmacy
date: 2026-08-22
ids: [REQ022]
status: in-progress
---

# pharmacy — 2026-08-22

Derived from the CareOS PRD's M9. Entirely net-new — the existing `Products` model is a generic retail-item shape with no batch/store/stock-ledger concept. One of the PRD's three core differentiators (the closed Rx-to-pharmacy loop); depends on `REQ021` (prescriptions feed the dispense queue) and `REQ016` (drug master).

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ022 — see file for full title](../../requirements/pharmacy/requirement/REQ022-pharmacy-2026-08-22-inventory-dispense-and-gst-invoicing.md) — draft

## Related

- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
