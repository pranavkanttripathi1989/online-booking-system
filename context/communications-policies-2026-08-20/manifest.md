---
feature: communications-policies
date: 2026-08-20
ids: [REQ006, PLAN009, TP039, TR038]
status: in-progress
---

# communications-policies — 2026-08-20

Requirement written, grounded in `admin/Communications.jsx` (3 tabs, all mock) and `admin/Policies.jsx` (3 tabs; cancellation-rules tab already has real-looking inline `gql`, but direct check of `backend/src/schema.gql` confirmed none of those resolvers actually exist — only a read-only public-dialect type for the patient-facing booking flow).

The Cancellation Rules tab is now built, tested, and live-verified end-to-end (PLAN009/TP039/TR038) — see those docs for the schema/frontend contract mismatch found and resolved mid-build (a "global" rule needed its own `client_org_id` tenant anchor, beyond the original clinic-or-product-scope decision). Notification Templates and Security-settings tabs remain **not started**, still blocked on the two open feature-overlap questions (Communications' "Notification Templates" tab vs. the already-real `admin/EmailTemplates.jsx`; Policies' "Security settings" tab vs. `REQ005`'s Account & Security tab) — status stays `in-progress`, not `done`, until those are resolved and built.

## Requirement

- [REQ006 — Communications & Policies — Backend Requirements](../../requirements/communications-policies/requirement/REQ006-communications-policies-2026-08-20-notification-config-and-cancellation-rules.md) — draft, updated 2026-08-20

## Implementation plan

- [PLAN009 — Cancellation Rules backend](../../implementation-plans/communications-policies/requirement/PLAN009-communications-policies-2026-08-20-cancellation-rules-backend.md) — done

## Test plan

- [TP039 — Cancellation Rules backend](../../test-plans/communications-policies/requirement/TP039-communications-policies-2026-08-20-cancellation-rules.md) — approved

## Test results

- [TR038 — Cancellation Rules backend](../../test-results/communications-policies/requirement/TR038-communications-policies-2026-08-20-cancellation-rules.md) — passed
