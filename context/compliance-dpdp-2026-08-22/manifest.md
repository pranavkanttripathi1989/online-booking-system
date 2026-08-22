---
feature: compliance-dpdp
date: 2026-08-22
ids: [REQ034]
status: in-progress
---

# compliance-dpdp — 2026-08-22

Derived from the CareOS PRD's §12.1 (DPDP Act 2023 + Rules 2025), against a hard external enforcement clock (13 Nov 2026). `project-plans/03` already assessed the current partial state (encryption at rest, a basic data-export query, shallow audit logging). This requirement scopes granular purpose-specific consent, data-principal rights workflows, breach response, and a `Consents` model shared with `REQ028` (ABDM) rather than duplicated.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ034 — see file for full title](../../requirements/compliance-dpdp/requirement/REQ034-compliance-dpdp-2026-08-22-consent-rights-and-breach-workflows.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
