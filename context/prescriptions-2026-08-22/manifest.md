---
feature: prescriptions
date: 2026-08-22
ids: [REQ021]
status: in-progress
---

# prescriptions — 2026-08-22

Derived from the CareOS PRD's M8. Entirely net-new, and sits at the centre of the PRD's own stated wedge: the Rx a clinician signs must be the same object the in-house pharmacy dispenses against. Depends on `REQ020` (encounter) and `REQ016` (drug master); blocks `REQ022` (pharmacy) and `REQ026` (telemedicine, which cannot launch without the TPG drug-list guardrails this requirement builds).

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ021 — see file for full title](../../requirements/prescriptions/requirement/REQ021-prescriptions-2026-08-22-rx-builder-print-and-tpg-guardrails.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
