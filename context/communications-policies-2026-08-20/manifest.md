---
feature: communications-policies
date: 2026-08-20
ids: [REQ006, PLAN009, TP039, TR038, PLAN011, TP041, TR040]
status: in-progress
---

# communications-policies — 2026-08-20

Requirement written, grounded in `admin/Communications.jsx` (3 tabs, all mock) and `admin/Policies.jsx` (3 tabs; cancellation-rules tab already has real-looking inline `gql`, but direct check of `backend/src/schema.gql` confirmed none of those resolvers actually exist — only a read-only public-dialect type for the patient-facing booking flow).

The Cancellation Rules tab is built, tested, and live-verified end-to-end (PLAN009/TP039/TR038) — see those docs for the schema/frontend contract mismatch found and resolved mid-build (a "global" rule needed its own `client_org_id` tenant anchor, beyond the original clinic-or-product-scope decision).

Booking Policies (4 of 6 fields) and Communications' Global Settings (email half) are now also built, tested, and live-verified (PLAN011/TP041/TR040) — see those docs for two new contract findings logged rather than guessed at (Communications' SMS Settings card contradicts the fixed-vendor rule; Policies' Cancellation Policy/Late Fee sliders overlap with the Cancellation Rules tab), plus a real routing bug found and fixed: `/admin/policies` and `/admin/communications` were `admin`/`super_admin`-only, but both this pass's and PLAN009's backends are scoped off `client_org_id`, which only `manager` has — the pages were unusable by anyone who could actually reach them until the route guard was widened.

Notification Templates and Security-settings tabs remain **not started**, still blocked on the two open feature-overlap questions (Communications' "Notification Templates" tab vs. the already-real `admin/EmailTemplates.jsx`; Policies' "Security settings" tab vs. `REQ005`'s Account & Security tab) — status stays `in-progress`, not `done`, until those are resolved and built.

## Requirement

- [REQ006 — Communications & Policies — Backend Requirements](../../requirements/communications-policies/requirement/REQ006-communications-policies-2026-08-20-notification-config-and-cancellation-rules.md) — draft, updated 2026-08-20

## Implementation plans

- [PLAN009 — Cancellation Rules backend](../../implementation-plans/communications-policies/requirement/PLAN009-communications-policies-2026-08-20-cancellation-rules-backend.md) — done
- [PLAN011 — Booking Policies + Communication (Email) Settings](../../implementation-plans/communications-policies/requirement/PLAN011-communications-policies-2026-08-20-booking-policies-and-email-settings.md) — done

## Test plans

- [TP039 — Cancellation Rules backend](../../test-plans/communications-policies/requirement/TP039-communications-policies-2026-08-20-cancellation-rules.md) — approved
- [TP041 — Booking Policies + Communication (Email) Settings](../../test-plans/communications-policies/requirement/TP041-communications-policies-2026-08-20-booking-policies-and-email-settings.md) — approved

## Test results

- [TR038 — Cancellation Rules backend](../../test-results/communications-policies/requirement/TR038-communications-policies-2026-08-20-cancellation-rules.md) — passed
- [TR040 — Booking Policies + Communication (Email) Settings](../../test-results/communications-policies/requirement/TR040-communications-policies-2026-08-20-booking-policies-and-email-settings.md) — passed
