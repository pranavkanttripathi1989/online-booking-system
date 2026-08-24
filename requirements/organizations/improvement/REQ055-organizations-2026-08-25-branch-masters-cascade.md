---
id: REQ055
type: improvement
feature: organizations
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: REQ014
related: [REQ014, REQ016]
---

# Org->branch masters cascade

## Source

`REQ014`'s own P1 remainder (`US-ORG-05`, "Masters cascade") — Department/
Resource entities and self-serve trial signup already shipped (`REQ014`
itself, `REQ045`); only the cascade story itself remained open.

## User story

**US-ORG-05** — As an Org Admin managing a chain, I want to define a
service at the org level and let each branch either inherit it, override
its price, or skip it, so that I don't re-enter the same catalogue five
times.

- PRD ref: §7.1 "Masters cascade" (no discrete `FR-ORG-*` ID exists for
  this story in `REQ014`'s own text — confirmed by reading it directly)
- Priority: P1

### Acceptance criteria

- Given an org-level service with `inherit_mode: inherit`, when a branch
  has no override row, then the branch's booking page shows the org-level
  price.
- Given the same service with a branch-level override row, then the
  branch's booking page shows the override price and the org-level report
  attributes revenue to the correct price actually charged.

## Research finding that reshaped scope

A clinical service created via the canonical `createService` mutation
(`services.service.ts`) is, today, **already an org-level master**: it's
created with `clinic_id: null`, and `services`'s own `findAll` treats
`clinic_id` as an optional filter — every branch of the org already sees
the identical service and price. What genuinely didn't exist was any
per-branch *deviation* mechanism. This reframes the story from "add an
org-level default layer" (the pre-research assumption) to "add the missing
branch-override layer on top of an already-existing master" — a smaller,
more precisely-scoped change with zero migration risk for the ~all
existing services (no branch has an override row yet, so every one
continues to resolve exactly as it does today).

## Data-model impact

- `ProductBranchOverrides` (product_id, clinic_id, client_org_id, mode:
  inherit|override|skip, override_price, override_category_pricing_json,
  override_channel_pricing_json) — one row per (product, clinic); absence
  of a row is the default "inherit" state, identical to today's behaviour.
  `@@unique([product_id, clinic_id])`.
- `resolveServicePrice()` (`common/pricing/resolve-price.ts`) gains a 4th,
  optional `branchOverride` argument — the single shared pricing helper
  from `REQ016`, not a second parallel lookup, per this slice's own design
  mandate. `skip` returns null (unavailable); `override` resolves entirely
  within its own category/channel/flat-price fields, never falling through
  to the master (a branch that deliberately customized should not have a
  master-level category override leak back in); absent or `inherit`
  resolves against the master exactly as before.
- New `backend/src/branch-overrides/` module (`{success, userErrors,
  branchOverride?}` mutation convention, matching `cancellation-rules`'
  established shape) — `productBranchOverrides(clinic_id?)` query,
  `setProductBranchOverride` mutation. `clinic_id` is optional on the list
  query so the tenancy matrix (which cannot supply a per-actor argument)
  can still exercise this domain, matching `packages`'/`checklist`'s own
  precedent from earlier in this batch — omitted, returns every override
  across the caller's own org.
- Both real charge-determining call sites now pass the branch's override
  through: `createRazorpayOrder` (online channel) and
  `recordCounterPayment` (walkin channel), both in
  `appointment-payments.service.ts`.

## Deliberate scope decision — the display-preview call site

`appointments.service.ts`'s list-mapping `toGraphQL()` (used by the
`appointments` query's booking-preview `service.price` field) does **not**
apply the branch override — it's a synchronous function shared by a list
endpoint, and wiring a per-row branch-override lookup in would mean either
an N+1 query per appointment in a list result, or a batched pre-fetch this
function has no natural place to receive. Both real charge-determining
call sites (Razorpay order creation, counter payment) DO apply it. This is
a display-preview gap only — logged here as a named follow-up, not
silently accepted, matching this codebase's own "explicitly deferred, not
silently dropped" convention.

## Out of scope (deferred, not silently dropped)

A dedicated admin UI for setting branch overrides (backend-only this
batch, per the confirmed direction); bulk cascade-to-all-branches tooling;
retroactive reporting reconciliation for a service whose override changed
mid-billing-period.
