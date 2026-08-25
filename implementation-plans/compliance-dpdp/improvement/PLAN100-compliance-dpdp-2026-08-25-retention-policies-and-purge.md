---
id: PLAN100
type: improvement
feature: compliance-dpdp
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ073
related: []
---

# PLAN100 — Implementation plan for retention policies and purge

## Schema

`RetentionPolicies`: `id`, `client_org_id`, `data_class`,
`retention_years Int`, `legal_hold Boolean @default(false)`. `@@unique
([client_org_id, data_class])` — the upsert key.

## Changes

**`consent.input.ts`**: `RETENTION_DATA_CLASSES = ['clinical_records',
'test_results', 'consents', 'messages'] as const`, `RetentionPolicyInput`.

**`consent.service.ts`**: `findRetentionPolicies(user)` — `orgScope`.
`setRetentionPolicy(input, user)` — `orgIdForWrite(user,
'RetentionPolicy')`, then an upsert on the composite key. A platform
operator with no org gets `orgIdForWrite`'s `undefined` return, caught by
this method's own explicit `if (!orgId) throw BadRequestException(...)`
— a clearer message than letting a raw Prisma constraint error surface.

**`retention-purge.service.ts`** (new): `@Cron('0 3 * * *')` daily —
`const SUPPORTED_DATA_CLASSES = ['test_results'] as const`, deliberately
narrower than `RETENTION_DATA_CLASSES` (see `REQ073`'s own account of
why). Queries policies `{legal_hold: false, data_class: {in:
SUPPORTED_DATA_CLASSES}}` — filtering at the DB level, not in
application code, so an unsupported class is never even fetched. For
each due policy, computes a cutoff date and
`testResults.updateMany({where: {is_deleted: false, date_ordered: {lt:
cutoff}, ordered_by: {client_org_id: policy.client_org_id}}, data:
{is_deleted: true}})` inside a try/catch — one failing org's purge
doesn't block another's.

**`consent.module.ts`**: `ScheduleModule.forRoot()` + registered
`RetentionPurgeService`.

## Testing (see `TP127`)

`consent.service.spec.ts` extended — 4 new cases (org-scoping,
platform-operator rejection, the upsert's create/update shapes,
`legal_hold: true` honored). `retention-purge.service.spec.ts` (new, 5
cases) — no due policies, the query's own where-shape, a real purge with
the correct cutoff-year math, an unsupported data class defensively
never touched even if one somehow came back from the query, and
continue-on-failure across multiple policies.

## Live verification

`setRetentionPolicy(data_class: 'test_results', retention_years: 7)`
against the real dev DB — read back correctly via `retentionPolicies`.
Left in place as new reference data: `retention_years: 7` has zero real
effect on today's dev data (nothing is 7 years old), so it's inert, not
a live data-destruction risk, matching the "new rows stay" convention.
The purge sweep itself was not triggered live (it's cron-scheduled for
3am and its correctness — cutoff math, legal-hold/unsupported-class
exclusion, continue-on-failure — is thoroughly covered by its own 5-case
unit suite against a mocked Prisma client).
