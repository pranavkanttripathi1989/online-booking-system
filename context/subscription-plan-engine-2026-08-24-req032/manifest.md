---
id: CTX-subscription-plan-engine-2026-08-24-req032
type: requirement
feature: subscription-plan-engine
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ032
related: [PLAN066, TP093, TR092]
---

# subscription-plan-engine — REQ032 slice: plan-builder data model and versioning (2026-08-24)

Second of eight requirement slices in this pass (REQ018 → **REQ032** →
REQ034 → REQ022 → REQ030 → REQ031 → REQ015 → REQ029). The one item the
prior session's own machine-handoff notes explicitly named as
"deliberately paused before starting" — picked up here exactly where that
note recommended: the additive, lower-risk plan-builder data model, not
the entitlement guard.

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN066 | [plan-builder data model and versioning](../../implementation-plans/subscription-plan-engine/requirement/PLAN066-subscription-plan-engine-2026-08-24-plan-builder-data-model.md) |
| test-plans | TP093 | [verification plan](../../test-plans/subscription-plan-engine/requirement/TP093-subscription-plan-engine-2026-08-24-plan-builder-data-model.md) |
| test-results | TR092 | [verification results — pass](../../test-results/subscription-plan-engine/requirement/TR092-subscription-plan-engine-2026-08-24-plan-builder-data-model.md) |

## What shipped

`Plans`/`PlanVersions` (platform-level, `super_admin`-only), real
versioning semantics: editing a live plan closes the currently-open
version and opens a new one, never mutating the closed row a subscriber
may already be pinned to (`US-PLAN-02`'s own acceptance criterion).

## What's deliberately NOT built

`US-PLAN-03` (the global entitlement guard consulted on every
feature-gated resolver call) and `US-PLAN-04` (trials) — CLAUDE.md's own
caution stands: the guard integration is a separate, higher-risk step
(Redis-backed caching, cache-invalidation-on-plan-change) requiring its
own scoped plan, not something to bolt onto this data-model slice.

## Next in this pass

REQ034 (DPDP consent + data-subject rights requests).
