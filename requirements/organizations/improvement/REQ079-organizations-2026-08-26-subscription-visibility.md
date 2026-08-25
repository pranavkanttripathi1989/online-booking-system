---
id: REQ079
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: —
related: [REQ032]
---

# REQ079 — Read-back visibility for an organization's subscription

## Why this slice

The user asked how to check an organization's subscription. Investigation
found two distinct, unrelated "subscription/plan" concepts already in this
schema:

1. **`OrganizationSubscriptions`/`SubscriptionPlans`** — a real Prisma
   model pair, written once during the self-serve onboarding wizard
   (`organization-onboarding.service.ts`'s `selectPlan()`) but never read
   back anywhere: no query, no resolver, no admin UI existed before this
   slice.
2. **`Plans`/`PlanVersions`** — `REQ032`'s newer plan-builder catalog
   engine (`admin/Plans.jsx`). Has no link to `ClientOrganizations` at
   all; the entitlement guard that would connect a org to a plan
   (`US-PLAN-03`) is deliberately paused per `CLAUDE.md`'s own standing
   caution (risk of silently over/under-gating every feature-flagged
   module in the product at once).

The user explicitly chose the small, safe option — wire up the existing,
already-populated-in-principle table (#1) — over building the
`US-PLAN-03` entitlement guard. Per the working-loop instruction to check
first, `implementation-plans/subscription-plan-engine/README.md` and
`implementation-plans/platform-billing/` (which doesn't exist as a
directory) were both checked; `REQ032`'s own document explicitly marks
the entitlement/org-linkage work as "Deliberately NOT started" — nothing
pending covers this specific read-back gap.

This is additive and isolated: no schema change (the tables already
exist), no risk to any other feature. Filed under the existing
`organizations` feature slug (already owns `admin/Organizations.jsx` and
`organizations.resolver.ts`) as a standalone improvement — no parent
requirement, since it is unrelated to `REQ032`'s different table (linked
via `related` only, to make the two-systems distinction discoverable).

## What was built

- `organizationSubscription(orgId: ID!)` GraphQL query
  (`organizations.resolver.ts`), gated `@Auth('admin', 'super_admin')` —
  the same gate as every other query on this resolver.
- `OrganizationsService#getSubscription(orgId)` — reads the most recent,
  non-soft-deleted `OrganizationSubscriptions` row for the org (`include:
  {plan: true}`), converts `price_monthly`/`price_yearly` from paise to
  rupees at the resolver boundary (Hard Rule 9), returns `null` when none
  exists.
- A new "View subscription" icon button on `admin/Organizations.jsx`'s
  existing row-actions (alongside Edit/Delete), opening a read-only
  Dialog: plan name, a colored status Chip (green/blue/red for
  active/trial/other, matching the page's existing `is_active` Chip
  convention), billing cycle, current period dates (via `formatDate`),
  price (via `formatCurrency`), and clinic/user limits.
- An honest "No subscription on file for this organization" empty state
  — confirmed via direct SQL that every real org in the current dev DB
  has zero subscription rows (admin-created orgs never go through the
  onboarding wizard), so this is the common case today, not an edge
  case. No mock-fallback for this dialog (Hard Rule 8) — a missing
  subscription is a real, expected state, not a network failure to paper
  over.

## What was deliberately NOT built

- Any link between this table and `REQ032`'s `Plans`/`PlanVersions`
  catalog, or an entitlement guard — out of scope, per the user's own
  choice of the smaller slice.
- Any write path (upgrading/cancelling a subscription from the admin
  panel) — this slice is read-only visibility only.
- Any change to the onboarding wizard's own write path.

## Live verification

Queried `organizationSubscription` for two real seeded orgs (City Heart
Clinic Group, Westside Health Group) — both returned `null`, confirming
the empty state matches real data. Temporarily inserted one
`SubscriptionPlans` + `OrganizationSubscriptions` row for one real org
via direct SQL, re-queried, and confirmed the populated response
(`price_monthly: 500000` paise → `5000` returned, i.e. ₹5,000) — then
reverted both rows via direct SQL, confirmed zero residue.

See `implementation-plans/organizations/improvement/PLAN110-...md` for
the full technical plan and `test-results/organizations/improvement/
TR136-...md` for the full verification record.
