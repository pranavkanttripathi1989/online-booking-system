---
feature: platform-nfr
date: 2026-08-22
ids: [REQ035]
status: in-progress
---

# platform-nfr — 2026-08-22

Derived from the CareOS PRD's §7 and §13 (architecture and non-functional requirements). Adopts `project-plans` F-13/F-14/F-15 (zero database indexes, unbounded resolvers, N+1/JS-side aggregation) as standing engineering constraints every other requirement in this set (`REQ014`-`034`) must satisfy from day one, rather than re-deriving them. Also scopes genuinely new NFR gaps: offline resilience, low-bandwidth budget, accessibility audit, i18n, and observability/SLOs.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ035 — see file for full title](../../requirements/platform-nfr/requirement/REQ035-platform-nfr-2026-08-22-performance-scale-availability-and-accessibility.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
