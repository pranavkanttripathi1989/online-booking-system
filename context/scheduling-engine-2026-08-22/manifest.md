---
feature: scheduling-engine
date: 2026-08-22
ids: [REQ017]
status: in-progress
---

# scheduling-engine — 2026-08-22

Derived from the CareOS PRD's M4, which the PRD itself calls "the heart of the product. Failure here is unrecoverable." The existing `availability` module is a correctly-built slot-mode-only engine; the PRD requires session/token mode (the actual Indian OPD reality), multi-resource intersection booking, and a database-level slot-conflict constraint that closes `project-plans` F-16 as part of the same work.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ017 — see file for full title](../../requirements/scheduling-engine/requirement/REQ017-scheduling-engine-2026-08-22-dual-mode-calendar-and-slot-integrity.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
