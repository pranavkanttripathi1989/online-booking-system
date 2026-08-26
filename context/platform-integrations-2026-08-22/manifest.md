---
feature: platform-integrations
date: 2026-08-22
ids: [REQ030]
status: in-progress
---

# platform-integrations — 2026-08-22

Derived from the CareOS PRD's M16. Entirely net-new — the current API surface is internal GraphQL only, with no versioned public REST API, no externally-facing signed webhooks, and only one payment gateway with no stated failover. Depends on `REQ015`'s API-key infrastructure; every new external endpoint must inherit the same fail-closed guard discipline `project-plans` already audited internally.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ030 — see file for full title](../../requirements/platform-integrations/requirement/REQ030-platform-integrations-2026-08-22-public-api-webhooks-and-payment-gateways.md) — draft

## Related

- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
