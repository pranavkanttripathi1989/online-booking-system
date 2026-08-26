---
feature: notifications
date: 2026-08-22
ids: [REQ025]
status: in-progress
---

# notifications — 2026-08-22

Derived from the CareOS PRD's M11 transactional-notification half, extending the real trigger pipeline and pluggable provider registry already shipped under `REQ008`. `project-plans/analysis/05-competitive-analysis.md` independently named adding a WhatsApp provider to this exact registry as "the highest-ROI item" in its entire competitive analysis — the encrypted-credential and dispatch infrastructure already exists; this requirement is additive, not a rebuild. Also scopes per-org sender identity, a message credit wallet, quiet hours/frequency caps, and delivery analytics.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet.

## Requirement

- [REQ025 — WhatsApp as a first-class channel, sender identity, and message credit wallet](../../requirements/notifications/requirement/REQ025-notifications-2026-08-22-whatsapp-sender-identity-and-credit-wallet.md) — draft

## Related

- [notifications-2026-08-21 bundle](../notifications-2026-08-21/manifest.md) — REQ008, the trigger pipeline and provider registry this requirement extends.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
