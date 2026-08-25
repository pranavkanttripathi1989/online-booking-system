---
id: PLAN110
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ079
related: []
---

# PLAN110 — Read-back visibility for an organization's subscription

Implementation plan for `REQ079`.

## Backend

**`backend/src/organizations/entities/organization.entity.ts`** — new
`@ObjectType()` `OrganizationSubscriptionType`:

```
id, plan_name, status, billing_cycle,
current_period_start, current_period_end,
price_monthly, price_yearly (rupees, converted from paise),
max_clinics, max_users
```

**`backend/src/organizations/organizations.service.ts`** — new
`async getSubscription(orgId: string)`:

```ts
async getSubscription(orgId: string) {
  const row = await this.prisma.organizationSubscriptions.findFirst({
    where: { client_org_id: orgId, is_deleted: false },
    orderBy: { created_at: 'desc' },
    include: { plan: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    plan_name: row.plan.name,
    status: row.status,
    billing_cycle: row.billing_cycle,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    price_monthly: row.plan.price_monthly / 100,
    price_yearly: row.plan.price_yearly / 100,
    max_clinics: row.plan.max_clinics,
    max_users: row.plan.max_users,
  };
}
```

Picks the most recently created non-deleted row when more than one
exists (a real org could in principle have a history of subscriptions —
this shows the current one). No new tenant-scoping logic beyond `orgId`
itself — the caller must already be `admin`/`super_admin` per the
resolver gate, and `orgId` is an explicit, deliberate argument here (not
sourced from the JWT), matching every other query on this resolver
(`organizationsPaginated` already takes a caller-supplied search/id —
platform-admin routes legitimately operate across every org, unlike a
tenant-scoped resolver).

**`backend/src/organizations/organizations.resolver.ts`** — new query:

```ts
@Auth('admin', 'super_admin')
@Query(() => OrganizationSubscriptionType, { nullable: true })
organizationSubscription(@Args('orgId', { type: () => ID }) orgId: string) {
  return this.organizationsService.getSubscription(orgId);
}
```

## Frontend

**`frontend/src/pages/admin/Organizations.jsx`**:

- New inline `GET_ORG_SUBSCRIPTION` gql query, matching this file's own
  established pattern (inline `gql` + `client.query()`, not the
  canonical `graphql/*.js` files — this page has no canonical-dialect
  operations to conflict with).
- New state: `subOpen`, `subOrgName`, `subLoading`, `subData` (`undefined`
  = not yet loaded, `null` = confirmed no subscription), `subError`.
- New `openSubscription(org)` handler — sets loading/dialog-open state,
  fires `client.query({fetchPolicy: 'network-only'})`, stores the result
  or the error message.
- New `ReceiptLongIcon` icon button in the row-actions `Stack`, before
  the existing Edit button, `title="View subscription"`.
- New read-only `Dialog` (placed after the existing Create/Edit Dialog
  and `ConfirmDialog`): loading spinner, error `Alert`, an honest empty
  state ("No subscription on file for this organization.") for
  `subData === null`, and the populated view (plan name, status Chip,
  billing cycle, price via `formatCurrency`, current period via
  `formatDate`, clinic/user limits) for a real row.

No mock-fallback for this dialog — unlike the page's own pre-existing
list-load `MOCK_ORGS` fallback, a missing subscription is a real,
expected state to show honestly (Hard Rule 8).

## Testing

- `organizations.service.spec.ts` — 4 new cases in a `getSubscription`
  describe block: returns `null` when none exists; scopes to
  `{client_org_id, is_deleted: false}`; converts paise→rupees correctly;
  orders by `created_at: 'desc'`.
- `organizations.resolver.spec.ts` — `organizationSubscription` added to
  the existing `it.each` role-gating table (asserts `['admin',
  'super_admin']`); 2 new cases in a dedicated describe block (delegates
  to the service with the given orgId; returns `null` through when the
  service does).
- Live verification against the real dev stack (not just mocked-Prisma
  unit tests): queried `organizationSubscription` for two real seeded
  orgs over real GraphQL with a real admin JWT — both `null`, confirming
  the empty state. Temporarily inserted one `SubscriptionPlans` +
  `OrganizationSubscriptions` row via direct SQL for one real org,
  re-queried — confirmed the populated shape and paise→rupees conversion
  (500000 paise stored → `5000` returned). Reverted both rows via direct
  SQL, confirmed zero residue via a follow-up `SELECT count(*)`.

## Verification run

- `cd backend && npx tsc --noEmit && npx jest src/organizations --maxWorkers=2` — clean, 39/39 passing.
- `cd frontend && npx eslint src/pages/admin/Organizations.jsx` — 0 errors, 14 warnings (all pre-existing-pattern hex-literal warnings, matching the file's own already-present `is_active` Chip).
- `cd frontend && npm run build` — clean, 3m51s.
- Full backend suite (`npx jest --maxWorkers=2`), `npm run test:int`, `npx eslint`, `npx tsc --noEmit` — see `TR136` for the full run record.

## Documentation

`REQ079` (requirement), this document (`PLAN110`), `TP137`/`TR136`
(test plan/results), a context bundle at
`context/organizations-2026-08-26-req079/manifest.md`, and index updates
to `requirements/organizations/README.md`,
`implementation-plans/organizations/README.md`,
`test-plans/organizations/README.md`,
`test-results/organizations/README.md`, plus the five root README index
tables.

## Commits

Three commits, matching this session's own established per-slice
convention: backend (query/service/resolver + tests), frontend (Dialog +
icon button), docs (REQ/PLAN/TP/TR + all index updates).
