---
feature: clinical-records
date: 2026-08-22
ids: [REQ020]
status: in-progress
---

# clinical-records — 2026-08-22

Derived from the CareOS PRD's M7 (EMR). Entirely net-new — no `Encounter`/`Diagnosis`/`Vital` model exists anywhere. `project-plans/05` names this the single largest strategic gap versus the competitive set. Scopes only the MVP-critical subset (structured notes, templates, sign-off immutability, timeline); ICD-10 coding, CDS, and speciality packs are explicitly deferred to their own follow-on slices.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ020 — see file for full title](../../requirements/clinical-records/requirement/REQ020-clinical-records-2026-08-22-emr-consultation-workspace.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
