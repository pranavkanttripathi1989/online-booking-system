---
id: CTX-organizations-2026-08-26-req079
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ079
related: [REQ032, PLAN110, TP137, TR136]
---

# organizations — REQ079: subscription read-back visibility (2026-08-26)

Standalone slice, prompted directly by the user asking how to check an
organization's subscription — not part of a batch. Per the user's own
explicit instruction, `project-plans/` and `implementation-plans/` were
checked first (`implementation-plans/subscription-plan-engine/README.md`,
`requirements/subscription-plan-engine/requirement/REQ032-...md`) and
confirmed nothing pending covers this gap; `REQ032`'s own status note
explicitly marks the entitlement/org-linkage work "Deliberately NOT
started."

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ079 | [subscription read-back visibility](../../requirements/organizations/improvement/REQ079-organizations-2026-08-26-subscription-visibility.md) |
| implementation-plans | PLAN110 | [implementation plan](../../implementation-plans/organizations/improvement/PLAN110-organizations-2026-08-26-subscription-visibility.md) |
| test-plans | TP137 | [verification plan](../../test-plans/organizations/improvement/TP137-organizations-2026-08-26-subscription-visibility.md) |
| test-results | TR136 | [verification results](../../test-results/organizations/improvement/TR136-organizations-2026-08-26-subscription-visibility.md) |

## What shipped

Investigation found two distinct, unrelated "subscription/plan" systems
in this schema: the old `OrganizationSubscriptions`/`SubscriptionPlans`
pair (written once during onboarding, never read back) and `REQ032`'s
newer `Plans`/`PlanVersions` catalog builder (no org linkage, entitlement
guard deliberately paused). The user chose the small, safe path: read
back the existing table, not build the entitlement-guard system.

New `organizationSubscription(orgId: ID!)` query, `@Auth('admin',
'super_admin')`, plus `OrganizationsService#getSubscription()` — no
schema/migration change, both models already existed. New read-only
"View subscription" Dialog on `admin/Organizations.jsx`'s row-actions,
with an honest "No subscription on file" empty state (confirmed via
direct SQL to be the real state for every org in the current dev DB —
admin-created orgs never go through the onboarding wizard that would
populate this table).

## Verification

Backend unit (`organizations.service.spec.ts` +
`organizations.resolver.spec.ts`): 39/39 passing, `tsc --noEmit` clean.
Frontend: `eslint` on the touched file — 0 errors, 14 warnings (all
pre-existing hex-literal pattern, matching the file's own already-present
`is_active` Chip); `npm run build` clean.

Live verification against the real dev stack: queried
`organizationSubscription` for two real seeded orgs over real GraphQL
with a real admin JWT — both returned `null`, confirming the empty state
matches real data. Temporarily inserted one `SubscriptionPlans` +
`OrganizationSubscriptions` row via direct SQL for one real org,
re-queried — confirmed the populated shape and correct paise→rupees
conversion (500000 paise → 5000 returned). Reverted both rows via direct
SQL, confirmed zero residue via a follow-up `SELECT count(*)`.

Full backend suite, `test:int`, `eslint`, `tsc --noEmit` — see `TR136`
for the complete run record.

## What was deliberately NOT built

Any link to `REQ032`'s `Plans`/`PlanVersions` catalog, any entitlement
guard, and any write path (upgrade/cancel a subscription from the admin
panel) — this slice is read-only visibility only, matching the user's
own explicit choice of the smaller, safer scope.
