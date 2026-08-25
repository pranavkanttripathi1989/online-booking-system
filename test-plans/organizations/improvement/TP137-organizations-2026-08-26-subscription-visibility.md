---
id: TP137
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN110
related: [REQ079]
---

# TP137 — Test plan: subscription read-back visibility

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a routine additive read query matching this resolver's already-proven
gate/response pattern (`organizationsPaginated` already does the exact
same `@Auth('admin', 'super_admin')` shape). Going straight to this
approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `getSubscription()` — no subscription row for the org | Returns `null` |
| 2 | `getSubscription()` — scoping | `findFirst` called with `where: {client_org_id, is_deleted: false}` |
| 3 | `getSubscription()` — a real row exists | Paise fields converted to rupees; `plan_name` sourced from the joined plan |
| 4 | `getSubscription()` — more than one subscription row exists | `orderBy: {created_at: 'desc'}` — most recent wins |
| 5 | `organizationSubscription` resolver — role gating | Gated to exactly `['admin', 'super_admin']`, same as every other query on this resolver |
| 6 | `organizationSubscription` resolver — delegates | Calls `service.getSubscription(orgId)` with the given id, returns its result verbatim |
| 7 | `organizationSubscription` resolver — no subscription | Returns `null` through, not an error |
| 8 (live) | Real GraphQL query, real admin JWT, a real org with no subscription | `null` — confirms the honest empty UI state matches real data |
| 9 (live) | Real GraphQL query after a temporary SQL-inserted subscription row | Correct populated shape, correct paise→rupees conversion; row reverted afterward, zero residue confirmed |
| 10 | Frontend: `admin/Organizations.jsx` — clicking the new "View subscription" icon | Opens the Dialog, shows loading then either the populated view or the "No subscription on file" empty state |

## Out of scope

- Any write-path test (upgrade/cancel a subscription) — this slice is
  read-only.
- Non-admin/super_admin role rejection beyond the standard `it.each`
  gating table already covering every query on this resolver — no new
  gating logic was introduced.
