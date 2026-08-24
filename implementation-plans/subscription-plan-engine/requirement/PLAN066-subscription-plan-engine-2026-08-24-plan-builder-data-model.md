---
id: PLAN066
type: requirement
feature: subscription-plan-engine
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ032
related: []
---

# PLAN066 — Implementation plan: plan-builder data model and versioning

## Scope

`US-PLAN-01` (compose a plan through feature flags/quotas/pricing, no
deploy needed) and `US-PLAN-02` (editing a live plan creates a new
version, never mutates one a subscriber may be on). Deliberately NOT in
scope: `US-PLAN-03` (entitlement enforcement — the global guard consulted
on every feature-gated resolver) and `US-PLAN-04` (trials). This is the
one item CLAUDE.md's own machine-handoff notes explicitly named as
"deliberately paused before starting" in the prior session, with an
explicit recommendation to start here — the plan-builder data model and
versioning, additive and lower-risk — and treat the guard's integration
into the shared `APP_GUARD` chain as its own future reviewed step.

## Design

Platform-level, not tenant-scoped — confirmed via schema read before
designing: `ClientOrganizations` has no `plan_id`/`subscription_tier`
field today, and no `Plan`/`Subscription`/`Entitlement` model exists
anywhere. `Plans` (name, tier, is_active) + `PlanVersions` (version Int,
`effective_from`/`effective_until`, `billing_period`, `price_paise`,
`feature_flags_json`, `quotas_json`) — a plan and its first version are
created together in one call (a plan with zero versions has nothing to
assign to a tenant). `createPlanVersion` is the `US-PLAN-02` behaviour:
closes the currently-open version (`effective_until: now()`) and creates
`version + 1`, inside one `$transaction`, never mutating the closed
version's own row.

`feature_flags`/`quotas` are structured GraphQL input/object types
(`FeatureFlagInput{key,enabled}`, `PlanQuotaInput{key,value}` — arrays of
key-value pairs, converted to/from a JSON map at the service boundary),
matching this codebase's established convention (`CategoryPricingInput`
from `REQ016`) of flattening a JSON column into explicit typed fields
rather than introducing a raw JSON GraphQL scalar for the first time.

Every mutation gated `@Auth('super_admin')` only — not `admin`, since a
plan catalog genuinely is the single most platform-global object in this
schema (every tenant reads from the same rows); `admin` stays excluded
deliberately, narrower than this session's other new domains.

## Files touched

- `backend/prisma/schema.prisma` — new `Plans`, `PlanVersions` models.
- `backend/src/plans/` (new module) — `module/resolver/service`,
  `dto/plan.input.ts`, `entities/plan.entity.ts`.
- No frontend admin page — the requirement's own P0 stories are about the
  data model and versioning mechanics being real and correct, not a
  polished UI; a Super Admin "Plans" console is deliberately deferred to a
  future slice once `US-PLAN-03`'s guard makes the plans actually matter
  to a tenant, logged as open rather than built ahead of its own consumer.

## GraphQL contract

`plans`/`plan(id)` queries, `createPlan`/`createPlanVersion`/
`setPlanActive` mutations, all `@Auth('super_admin')`. No existing
frontend contract to match — genuinely new surface.

## Test plan

See `TP093`.

## Test results

See `TR092`.
