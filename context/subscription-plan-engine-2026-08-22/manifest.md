---
feature: subscription-plan-engine
date: 2026-08-22
ids: [REQ032]
status: in-progress
---

# subscription-plan-engine — 2026-08-22

Derived from the CareOS PRD's §10 (Super Admin plan builder). `SubscriptionPlans`/`OrganizationSubscriptions` exist as schema only; `CLAUDE.md` already documented plan-entitlement enforcement as "not built" — this requirement is what closes that acknowledged gap with a real feature-flag/quota/metered-service entitlement guard, versioning, trials, dunning, and GST-compliant SaaS invoicing.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ032 — see file for full title](../../requirements/subscription-plan-engine/requirement/REQ032-subscription-plan-engine-2026-08-22-entitlements-quotas-and-plan-builder.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
