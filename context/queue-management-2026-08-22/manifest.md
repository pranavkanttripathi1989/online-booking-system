---
feature: queue-management
date: 2026-08-22
ids: [REQ019]
status: in-progress
---

# queue-management — 2026-08-22

Derived from the CareOS PRD's M6. Entirely net-new — `waiting-room/index.jsx` is one of the fourteen pages `project-plans` F-18 found rendering fabricated data with no backend at all. Depends on `REQ017`'s session/token mode existing first; reuses the existing `graphql-ws`/PubSub real-time transport rather than building a second one.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ019 — see file for full title](../../requirements/queue-management/requirement/REQ019-queue-management-2026-08-22-checkin-token-and-live-queue.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
