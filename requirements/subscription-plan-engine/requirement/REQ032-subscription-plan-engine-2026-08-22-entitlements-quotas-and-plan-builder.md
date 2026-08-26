---
id: REQ032
type: requirement
feature: subscription-plan-engine
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: null
related: [REQ033, PLAN066, TP093, TR092]
---

## Status (2026-08-24)

**`US-PLAN-01`/`US-PLAN-02` shipped** (`PLAN066`/`TP093`/`TR092`) — the
plan-builder data model and versioning only: `Plans`/`PlanVersions`,
super_admin-only CRUD, editing a live plan closes the old version
(`effective_until`) and opens a new one rather than mutating it in place.
See `context/subscription-plan-engine-2026-08-24-req032/manifest.md`.

**Deliberately NOT started**: `US-PLAN-03` (entitlement enforcement — the
global guard consulted on every feature-gated resolver call) and
`US-PLAN-04` (trials). CLAUDE.md's own explicit caution stands: the guard
integration is a separate, higher-risk step requiring its own scoped plan
(Redis-backed caching, cache-invalidation-on-plan-change), not something to
bolt onto this additive data-model slice.

# Super Admin plan builder: entitlements, quotas, metered services, and versioning

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §10 **Subscription, Plans & Pricing Engine (Super Admin)** (`FR-PLAN-01`–`14`, §10.2 plan matrix). Cross-referenced against `SubscriptionPlans`/`OrganizationSubscriptions` in `schema.prisma` and `project-plans/analysis/02-findings-register.md`.

## Current state vs. PRD ambition

`SubscriptionPlans` and `OrganizationSubscriptions` already exist as Prisma models, and `context/README.md` records that `SUBSCRIPTION_PLANS` mock data (starter/pro/enterprise, real INR pricing) was seeded during the pre-backend planning phase. But `CLAUDE.md`'s own Priority-2 status notes plan-entitlement enforcement as **"not built (no guard exists yet since there's no backend)"** — this is a previously-acknowledged gap, not a new discovery, and this requirement is what closes it.

The PRD's ambition is a full commercial plan-builder: three composable primitives (feature flags, quotas, metered services), versioning with grandfathering, price books, trials, add-ons, proration, coupons, dunning, and GST-compliant SaaS invoicing. None of this exists today beyond the two schema tables — there is no Super Admin UI to compose a plan, no entitlement-checking guard anywhere in the resolver layer, and no usage-metering pipeline.

This is the mechanism that makes the entire product commercially sellable per the PRD's own framing (§10 intro: *"this module is what makes the business sellable"*) — without it, every plan tier in §10.2's matrix is a marketing page with nothing enforcing it.

## Gap classification

- **Extend existing:** `SubscriptionPlans`/`OrganizationSubscriptions` gain the version/entitlement structure needed; no need to redesign from scratch.
- **Net-new, entirely:** the plan-builder UI itself; the entitlement-checking guard (feature flags, quotas, metered draw-down); versioning with grandfathering; price books and negotiated pricing; trials with auto-convert/expire; add-ons; proration; coupons; dunning state machine; usage-metering pipeline; GST-compliant SaaS invoicing to tenants; revenue reporting (MRR/ARR/churn/LTV).

## Phase assignment

PRD Phase: not explicitly phased in the PRD's module table, but the roadmap (§18, Q2) names "Super Admin plan builder v1" as an MVP-GA exit criterion — treat `FR-PLAN-01`, `02`, `04`, `05`, `10`, `12` as **MVP (P0)** and the remainder (`03`, `06`–`09`, `11`, `13`, `14`) as **V1 GA (P1)**.

## Dependencies

- **Requires:** none upstream — this is a foundational platform capability every other module's commercial packaging depends on.
- **Blocks:** every feature-flagged module in §10.2's plan matrix (pharmacy, telemedicine, insurance, custom roles, API access, white-label) needs this requirement's entitlement guard to actually gate access — until it exists, every plan tier's feature list is aspirational.

## User stories

### Epic: Plan composition

**US-PLAN-01** — As a Super Admin, I want to compose a plan by selecting feature flags, setting quota values, and attaching metered items with unit prices, with no code deployment, so that pricing experiments don't require engineering time.
- PRD refs: FR-PLAN-01
- Priority: P0
- Acceptance criteria: given a new plan is composed entirely through the admin UI (feature toggles, numeric quotas, metered unit prices), it is immediately assignable to a tenant without a deploy.

**US-PLAN-02** — As a Super Admin, I want editing a live plan to create a new version while existing subscribers stay on their original version until explicitly migrated, so that a pricing change doesn't silently alter what a paying customer already agreed to.
- PRD refs: FR-PLAN-02
- Priority: P0
- Acceptance criteria: given plan v1 has active subscribers, editing it produces v2; every v1 subscriber's entitlements remain exactly as before until a Super Admin explicitly migrates them, one at a time or in bulk, with the migration itself audited.

### Epic: Entitlement enforcement

**US-PLAN-03** — As the system, I want every feature-flagged module to check the tenant's current plan entitlement before allowing access, so that a tenant on the Starter plan cannot use pharmacy just because the resolver exists.
- PRD refs: entitlement model, §10.1
- Priority: P0
- Acceptance criteria: given a tenant's plan does not include `pharmacy`, any pharmacy-domain mutation or query is rejected with a clear "upgrade required" response, not a generic permission error indistinguishable from an RBAC denial.
  - Given a quota (e.g., `max_clinician_seats`) is reached, creating another clinician is blocked with an upgrade prompt, not silently allowed past the stated limit.
  - Given a metered service (e.g., WhatsApp messages) draws from a prepaid wallet, usage beyond the wallet balance either blocks sending or bills in arrears per the plan's configured overage behaviour — never silently free.

### Epic: Trials, add-ons, and pricing

**US-PLAN-04** — As a prospective customer, I want a 14-day trial that doesn't require a credit card, so that I can evaluate the product before committing to pay.
- PRD refs: FR-PLAN-05
- Priority: P0
- Acceptance criteria: a trial's length, included features, and card-required flag are all plan-configurable; on expiry, the tenant either auto-converts to a paid plan or auto-expires into read-only mode per the plan's configuration, and a Super Admin can extend a specific trial with a reason, audited.

**US-PLAN-05** — As an org owner who needs one more branch than my plan includes, I want to purchase an add-on independently of upgrading my whole plan, so that I only pay for what I actually need more of.
- PRD refs: FR-PLAN-06, FR-PLAN-07
- Priority: P1
- Acceptance criteria: given an add-on is purchased mid-cycle, proration is computed to the day, not rounded to the next full billing period.

### Epic: Dunning and billing

**US-PLAN-06** — As a Super Admin, I want failed subscription collections to follow a defined dunning sequence (retry, escalating notification, read-only grace, suspension), so that involuntary churn is minimised without engineering intervention per failure.
- PRD refs: FR-PLAN-11
- Priority: P1
- Acceptance criteria: given a collection failure, the tenant enters `past_due`, receives escalating notifications, and after the configured grace period enters read-only mode; data is retained for 90 days post-suspension before any deletion policy applies (per `PRD §14.3`'s subscription state machine: `trial → active → past_due → grace(read_only) → suspended → cancelled`).

**US-PLAN-07** — As an Accountant at a tenant organization, I want GST-compliant SaaS invoices for my subscription with correct GSTIN and place-of-supply handling, so that our own books are statutorily correct.
- PRD refs: FR-PLAN-12
- Priority: P1
- Acceptance criteria: every platform invoice applies 18% GST correctly, captures the tenant's GSTIN, and is downloadable as invoice history.

### Epic: Platform revenue visibility

**US-PLAN-08** — As a Super Admin, I want MRR/ARR, churn, plan mix, and cohort retention reporting, so that I can run the business, not just the product.
- PRD refs: FR-PLAN-14
- Priority: P1
- Acceptance criteria: given a month closes, the revenue report reflects actual collected/expected MRR, expansion/contraction, and logo churn, matching the PRD's own success metrics (`§1.4`: NRR ≥110%, logo churn <1.5%/month) as the numbers this report must be able to produce.

## Data model impact

- `PlanVersion`: `id`, `plan_id`, `version`, `features_json`, `quotas_json`, `metered_json`, `price_json`, `active`.
- `Subscription`: `id`, `org_id`, `plan_version_id`, `period`, `seats_json`, `addons_json`, `status`, `current_period_end`.
- `UsageRecord`: `id`, `org_id`, `metric`, `qty`, `period`, `at` — the metering pipeline's raw event log.
- `PlatformInvoice`: `id`, `org_id`, `number`, `lines_json`, `gst_json`, `total`, `status`, `due_at`.
- A shared `EntitlementGuard` (NestJS guard, analogous in structure to the existing `RolesGuard`) consulted alongside — not instead of — the existing auth/role/permission guard chain.

## Non-functional notes

The entitlement guard adds a check to *every* gated resolver call — it must be cached (Redis, per-tenant, invalidated on plan/subscription change) to avoid becoming the kind of N+1-shaped latency cost `project-plans` F-15 already flagged elsewhere in this codebase.

## Open questions

- PRD §19.6: does a permanently free single-doctor tier accelerate the funnel enough to justify support cost — a business decision affecting plan-matrix design, not resolved here.
