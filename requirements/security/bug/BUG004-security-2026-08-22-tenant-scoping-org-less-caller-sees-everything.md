---
id: BUG004
type: bug
feature: security
created: 2026-08-22
updated: 2026-08-22
status: done
parent: null
related: [REQ001, BUG001]
---

# Public registration mints org-less accounts that read every tenant (F-01)

## Severity

**Critical (confirmed live).** A self-registered `patient` account read every
tenant's clinics, full service and product catalogues with prices, all rooms,
and the complete clinician roster, via a single HTTP call — no exploit tooling
beyond `curl` required.

## Evidence (`project-plans/02-findings-register.md` F-01)

Roughly a dozen call sites across `clinics.service.ts`, `rooms.service.ts`,
`services.service.ts`, `products.service.ts`, and `clinicians.service.ts`
independently reinvented the same pattern:

```ts
where: { ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}) }
```

and, for single-record reads:

```ts
if (user.client_org_id && record.client_org_id !== user.client_org_id) throw NotFound;
```

Both read as "an org-less caller sees everything" — correct while the only way
to hold a null org was to be seeded as `admin`/`super_admin`. It stopped being
correct the moment `@Public() register` (`auth.service.ts`) began minting
`patient`-role accounts with `client_org_id: null` on demand: the list-query
pattern degrades to `{}` (no filter, not "no result") for such a caller, and
the single-record pattern's `user.client_org_id &&` guard never even fires,
so it falls through and allows the read regardless of the record's owner.

## Fix applied

New shared module `backend/src/common/scoping/tenant-scope.ts`:

- `isPlatformOperator(user)` — an explicit `['admin', 'super_admin']` role
  allow-list, replacing "does this caller lack an org" with "is this caller
  actually a platform role". This is the actual fix — inferring privilege
  from an absent field was the bug; asserting the role is not.
- `orgScope(user, column?)` / `orgScopeVia(user, relation, column?)` — the
  list-query replacement. Platform operators get `{}` (unchanged — see every
  org, the existing documented default for legacy pre-org-linkage rows).
  Everyone else gets scoped to their own org, or to an impossible sentinel
  (`'__no_org__'`) if they have none — never to `{}`.
- `isSameOrg(user, recordOrgId)` / `assertSameOrg(user, recordOrgId, label)`
  — the single-record replacement. A non-operator with no org of their own
  now matches nothing, including another org-less legacy record (fail
  closed, not "compare null to null and pass"). `assertSameOrg` always
  throws `NotFoundException`, matching this codebase's existing convention
  of never confirming a cross-tenant record's existence.

Migrated five domains to the shared helper: `clinics`, `rooms`
(`findAll`/`findAllPaginated`/`findOne`/`assertClinicInScope`/`update`/`remove`),
`services` (the `Service` GraphQL type, backed by `Products`),
`products` (`findAll`/`findOne`/`categories`/`subcategories` and their
scoped-lookup helpers), and `clinicians`
(`findAll`/`findOne`/`toggleActive`/`create`'s clinic-ownership check).

One additional defect found and fixed during migration:
`clinicians.service.ts`'s `create()` read back the just-created record with a
synthetic `{ client_org_id: null } as JwtPayload` payload — a workaround that
only worked because the old `findOne()` check short-circuited to "no scope
check" for a null org. With `findOne()` now fail-closed, this synthetic
bypass would have incorrectly rejected the read immediately after a
successful create; replaced with the caller's real `user`, which is always
sufficient since the target clinic was already verified to be in-scope.

## Explicitly out of scope, and why

`Languages`, `ClinicianTypeModel`, and `RoomTypeModel` were named in the
original finding's file list alongside the five domains above, but
**confirmed via `schema.prisma` to have no `client_org_id` column at all** —
they are genuinely global, shared reference taxonomies by design (a
clinician-type dropdown is the same list for every tenant), not tenant-scoped
data with a missing filter. Treating their cross-org visibility as a leak
would have been over-fixing something that isn't broken; this corrects the
original finding's file list rather than silently narrowing the fix.

`patients.service.ts` (F-04/F-05) and `test-results.service.ts` (F-08) share
the *pattern* this fix addresses but are separate, already-logged findings
with their own root causes (`createPatient` has no caller context at all,
independent of `orgScope`) — not folded into this fix to keep it reviewable
as one coherent change.

## Verification

- **Unit**: new `common/scoping/tenant-scope.spec.ts` (17 tests) covers the
  helper directly. Each migrated domain's spec gained explicit F-01
  regression tests asserting an org-less non-operator (the exact
  self-registered-account shape) gets the sentinel filter on list queries —
  never `{}` — and is rejected on every single-record path, including
  against another org-less (legacy) record. Full backend suite: **641/641
  passing** (0 regressions; one `account.service.spec.ts` timeout under full
  parallel load was confirmed a pre-existing flake — 30/30 passing in
  isolation, unrelated to any file this fix touches).
- **Live, against the real running backend — the exact original
  reproduction, repeated verbatim**: a fresh `register()` call, same as
  before, returns `client_org_id: null`. Every query that previously leaked
  now returns empty: `clinics` → `[]`, `services` → `[]`, `products` → `[]`,
  `rooms` → `[]`, `clinicians` → `{total: 0}`.
- **Legitimate access confirmed unaffected**: a real manager (`client_org_id`
  set) still sees their own org's 3 clinics and its 8 clinicians; a platform
  operator (`admin`) still sees all 4 clinics across both orgs, unchanged —
  cross-checked directly against the database to confirm these counts are
  the caller's actual correct scope, not a residual leak.
