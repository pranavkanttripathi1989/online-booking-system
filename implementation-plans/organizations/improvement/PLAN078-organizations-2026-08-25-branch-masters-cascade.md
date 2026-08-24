---
id: PLAN078
type: improvement
feature: organizations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ055
related: [REQ014, REQ016]
---

# PLAN078 — Implementation plan: org->branch masters cascade

## Scope

`REQ055` (`US-ORG-05`, `REQ014`'s own P1 remainder) — let a branch either
inherit an org-level master service unchanged, override its price for that
branch only, or skip offering it there at all.

## Research finding that reshaped the design

Before writing this plan, `resolveServicePrice()`, `Products`, and the
`services`/`organizations`/`org-settings` modules were read directly (not
assumed from the requirement doc). The finding: `createService`
(`services.service.ts`) never sets `clinic_id` at all — every clinical
service created via the canonical path is already, today, an org-level
master (`clinic_id: null`), visible identically to every branch since
`findAll`'s `clinic_id` filter is optional. Retail `Products` (the
`products.service.ts` domain, pharmacy/inventory) is the opposite —
`clinic_id` comes straight from `CreateProductInput` and is always
branch-scoped there. `REQ055` is about the former only, matching the
story's own "service" wording. This meant the pre-research plan's own
"add an org-level default layer" framing was backwards — the org-level
layer already exists; what was missing was the branch's own deviation.

The other real precedent check: `ProductCancellationRules` is this
codebase's existing "org default, more specific row wins" pattern, but
it's a **priority-ordered separate-rows** shape, not a single-JSON-column
fixed-precedence shape like `resolveServicePrice()`. Since this slice's
own design mandate was "resolved in the same single helper... rather than
a second parallel lookup," the cancellation-rules shape was correctly not
copied — `ProductBranchOverrides` is instead a 1:1 `(product_id,
clinic_id)` row (a clinic can only ever have one stance per master
service, so priority ordering has no meaning here), and the resolution
itself lives inside `resolve-price.ts`, not a second query path.

## Design

New `ProductBranchOverrides` model (`product_id`, `clinic_id`,
`client_org_id`, `mode: inherit|override|skip`, `override_price`,
`override_category_pricing_json`, `override_channel_pricing_json`),
`@@unique([product_id, clinic_id])`. Absence of a row is the implicit
"inherit" state — identical to every existing service's behaviour today,
zero migration risk.

`resolveServicePrice()` (`common/pricing/resolve-price.ts`) gains a 4th,
optional `branchOverride` argument, checked **before** the master's own
category/channel resolution: `mode: 'skip'` returns null immediately (the
branch doesn't offer this service); `mode: 'override'` resolves entirely
within the override row's own category/channel/flat-price fields and
**never** falls through to the master (a branch that deliberately
customized should not have the master's own category override leak back
in); absent, or explicit `'inherit'`, resolves against the master exactly
as before this slice — every pre-existing call site that doesn't pass the
4th argument is byte-for-byte unaffected.

New `backend/src/branch-overrides/` module, scaffolded after
`cancellation-rules`' own `{success, userErrors, entity?}` shape and
`findScopedClinic()` pattern (return the clinic row itself, not a
boolean, so the row's `client_org_id` can be derived from the CLINIC's
org, not the caller's — the same reasoning `cancellation-rules.service.ts`
documents for its own `create()`). `productBranchOverrides(clinic_id?)`
query has an **optional** `clinic_id`, matching the `packages`/`checklist`
precedent from earlier in this batch, applied proactively this time —
omitted, lists every override across the caller's own org via
`orgScope()`, satisfying the tenancy matrix's fixed shared-query
constraint without a second code path. `setProductBranchOverride`
validates: the clinic is in the caller's scope; the target product exists,
belongs to the same org as the clinic, and is itself an org-level master
(`clinic_id: null` — a service already created directly at one clinic has
nothing to cascade from, so overriding it is rejected); and an `override`
mode carries at least one of price/category/channel (an override with
nothing set would resolve to `null` — silently making the service
unbookable — worse than rejecting it outright).

`CategoryPricingType`/`ChannelPricingType` (`services/entities/
service.entity.ts`) are reused verbatim for the override's own read-side
shape, matching this codebase's "typed pricing fields, not a raw JSON
scalar" convention (`CategoryPricingInput`/`ChannelPricingInput` likewise
reused on the input side) — confirmed no `graphql-type-json` package is
even a dependency here, so introducing one would have been a genuinely new
pattern, not a reuse of an existing one.

Both real charge-determining call sites in `appointment-payments.service.ts`
now fetch the branch's stance before calling the pricing helper:
`createRazorpayOrder` (`'online'` channel) and `recordCounterPayment`
(`'walkin'` channel), via a new `BranchOverridesService.getForPricing(productId,
clinicId)` — returns `null` (no lookup performed) if either id is missing,
otherwise the raw paise-unit row or `null` if no override exists, which
`resolveServicePrice()`'s new argument already treats identically to
"not passed at all."

## A scope decision, not a bug — the display-preview call site is
## deliberately unwired

`appointments.service.ts`'s `toGraphQL()` (feeds the `appointments` query's
booking-preview `service.price` field) does **not** receive a branch
override. It's a synchronous mapper shared by a list endpoint (`findAll`);
wiring a per-row lookup in means either an N+1 query per appointment in a
list result, or a batched pre-fetch this function has no natural place to
receive without restructuring `findAll` itself. Both real
charge-determining call sites DO apply the override — this is a
display-preview gap only, documented in `REQ055` as a named follow-up
rather than silently accepted, matching this codebase's own convention
for exactly this class of decision.

## Testing

`resolve-price.spec.ts` — 7 new cases in a "branch override (4th
argument)" describe block: unaffected when omitted/`undefined`/`null`
(today's existing behaviour, unchanged), `inherit` resolves against the
master, `skip` returns null, `override` uses its own flat/category/channel
pricing and never leaks the master's own category/channel pricing through.

`branch-overrides.service.spec.ts` (new, 14 cases): `list` (in-scope
clinic, cross-org clinic returns `[]`, nonexistent clinic, platform
operator can list any clinic, org-wide path for both org A and org B when
`clinic_id` omitted), `set` (cross-org clinic rejected, product from a
different org rejected, a clinic-scoped — not master — product rejected,
an empty override rejected, a real upsert converts rupees to paise and
stamps the clinic's own org), `getForPricing` (missing id short-circuits
with no DB call, no row returns null, a real row returns the raw paise
shape).

`appointment-payments.service.spec.ts` — 4 new cases: `createRazorpayOrder`
charges the override price not the master price, and rejects (no priced
product) when skipped; `recordCounterPayment` requires tenders to match
the override price, and rejects when skipped. All pre-existing tests in
this file needed a new `BranchOverridesService` mock provider defaulting
`getForPricing` to `null` — zero behavioural change for every test that
doesn't explicitly set a different return.

`branch-overrides` added to `matrix-coverage.int-spec.ts`'s `CASES`
(`allowedRoles: ['super_admin', 'admin', 'manager']`, matching
`cancellation-rules`' own role set for a policy-configuration domain, not
`packages`'/`checklist`'s wider staff-visible set).

Full suite: backend unit — 79/79 suites, 1165/1165 tests (was 78/1141
after `REQ054`). `npm run test:int` (from host) — 4/4 suites, 351/351
tests (was 342). `eslint`/`tsc --noEmit` clean. Two real eslint-caught
issues fixed before commit (both self-caught, no test failure needed to
surface them): an unused `pricingJsonToGraphQL` import (the entity
initially only exposed `override_price`, not the category/channel
overrides — fixed by adding both fields to the entity, matching the
`services` domain's own read-side completeness) and an unused `orgBUser`
test fixture (fixed by adding the genuine cross-org assertion it was
meant for, rather than deleting the fixture).

## Out of scope (deferred, not silently dropped)

Admin UI for setting branch overrides (backend-only this batch, per this
batch's confirmed direction); the `appointments.service.ts` display-preview
gap (see above); retail `Products`' own clinic-scoping is untouched —
`REQ055` is specifically about the `services` domain's master/branch
cascade, not a redesign of the retail-product model.
