---
id: PLAN229
type: improvement
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ166
related: [TP249, TR249]
---

# PLAN229 — Patient Membership Plans, built for real

## Research grounding

Closest existing precedent, confirmed by direct code read before
designing anything: `Packages`/`PatientPackages` (REQ054) — same shape
(an org+clinic catalog + a per-patient enrollment/purchase record), same
module scaffolding (`backend/src/packages/`), same tenant-scoping
helpers (`orgScopeVia`, `findScopedClinic`/`findOwned`,
`isPlatformOperator`/`isSameOrg`), same mutation-response convention
(`{success, userErrors, entity}`), and a directly-mirrorable admin UI
(`manager/packages/index.jsx`). This plan copies that shape rather than
inventing a new one (Hard Rule 7).

## Data model

```prisma
model MembershipPlans {
  id, client_org_id, clinic_id, name, description?, price_monthly_paise,
  is_active, is_deleted, created_at
  // + client_organization/clinic relations, patientMemberships[] reverse
  @@index([client_org_id, clinic_id])
}
model PatientMemberships {
  id, membership_plan_id, patient_id, client_org_id, clinic_id,
  price_monthly_paise (denormalized at enroll time), status ('active'|
  'cancelled'), enrolled_at, cancelled_at?, is_deleted
  @@index([patient_id, status])
  @@index([client_org_id, clinic_id])
}
```

Hand-written migration (`20260830000000_membership_plans`) also adds a
**partial unique index** — `CREATE UNIQUE INDEX ... ON
"PatientMemberships" ("patient_id") WHERE "status" = 'active' AND
"is_deleted" = false` — the real DB-level guarantee of one active
membership per patient. `enroll()` cancels any existing active row in
the same `$transaction` before creating the new one, so this index is a
safety net, never actually the mechanism that fires in the normal path.

## Backend — `backend/src/memberships/`, scaffolded exactly like `packages/`

- `MembershipPlanType`/`PatientMembershipType`/`MembershipUserErrorType`/
  `MembershipPlanMutationResultType`/`EnrollMembershipResultType` —
  same shape as `packages`' own entities, money converted paise↔rupees
  at the resolver boundary only.
- `@Auth` gates: catalog CRUD (`createMembershipPlan`/
  `updateMembershipPlan`/`deleteMembershipPlan`) restricted to
  `admin/super_admin/manager`, mirroring `packages.resolver.ts` exactly.
  `membershipPlans`/`patientMembership`/`enrollPatientMembership`/
  `cancelPatientMembership` are **widened past `packages`' own
  catalog-staff-only gate to include `clinician`** — the page this
  exists to serve (`patients/detail.jsx`) is clinician-facing, and
  without this widening the service's own `isSameOrg()` checks would be
  unreachable dead code for the caller who actually uses the feature
  (this session's own already-learned "webhooks/api-keys" lesson about
  `isPlatformOperator` treating every admin/super_admin as
  platform-wide, cited directly in the resolver's own code comment).
- `findScopedClinic`/`findOwnedPlan` copied verbatim from
  `packages.service.ts`'s own pattern. `patientMembership()` self+org
  scopes exactly like `patientPackages()` — `isPlatformOperator(user) ?
  {} : {client_org_id: user.client_org_id ?? '__no_org__'}`, never a bare
  ternary to `{}` (`BUG004`'s own standing lesson).
- `app.module.ts`: `MembershipsModule` registered.
- Tenancy matrix: new `CASES` row, `domain: 'memberships'`.

**Real finding, worth recording**: the tenancy-matrix's own
`matrix-coverage.int-spec.ts` derives its list of resolver domains by
literally scanning `backend/src/` directory names via `readdirSync`
(`resolverDomains()`), not from any string chosen in
`domain-cases.ts`'s own `CASES[].domain` field. The first attempt used
`domain: 'membership-plans'` (matching the feature's product name) and
the matrix failed with `unclassified: ["memberships"]` — the actual
backend folder is `memberships/`, and the two names must match exactly.
Fixed by renaming the `CASES` entry's `domain` to `'memberships'`.

## Frontend

- `patients/detail.jsx`: `MEMBERSHIP_PLANS` (hardcoded array) and
  `membershipId` (local `useState`) removed entirely. Real
  `useQuery(GET_PATIENT_MEMBERSHIP, {variables:{patient_id:id}})` +
  `useQuery(GET_MEMBERSHIP_PLANS, {skip: !membershipDialogOpen})` (only
  fetches once the dialog is actually opened) + `useMutation` for
  enroll/cancel, both refetching `GET_PATIENT_MEMBERSHIP` on completion
  (DATA-9). `NONE_MEMBERSHIP` is a client-side-only sentinel prepended
  to the real fetched plans so the dialog can still offer an explicit
  cancel action. Header chip and dialog keep their exact original visual
  shape/copy — only the data source changed. `formatCurrency` (shared
  util, `utils/dateTime.js`) replaces the old hand-rolled paise-dividing
  `formatInr`, since the real GraphQL `price_monthly` field is already
  rupees (converted at the resolver boundary), not paise.
- New `manager/memberships/index.jsx` — mirrors `manager/packages/
  index.jsx`'s exact structure (list + create/edit dialog form) for
  catalog CRUD. New route `/manager/memberships` (same `RoleGuard` block
  as `/manager/packages`) and nav entry in `AppShell.jsx`.

## Files changed

```
backend/prisma/schema.prisma                                  (2 new models + 3 reverse-relation fields)
backend/prisma/migrations/20260830000000_membership_plans/     (new, hand-written)
backend/src/memberships/                                       (new module: module/resolver/service/spec/dto/entities)
backend/src/app.module.ts                                      (register module)
backend/test/integration/setup/{domain-cases,fixture}.ts        (new CASES row + fixtures)
frontend/src/pages/patients/detail.jsx                          (real membership chip/dialog)
frontend/src/pages/patients/detail.test.jsx                     (4 new tests)
frontend/src/pages/manager/memberships/index.jsx                (new)
frontend/src/pages/manager/memberships/index.test.jsx           (new, 3 tests)
frontend/src/App.jsx                                            (lazy import + route)
frontend/src/layouts/AppShell.jsx                               (nav entry)
```

## Verification

- Backend: `memberships.service.spec.ts` — 20/20 pass (list/create/
  update/delete happy paths, cross-org rejection on every mutation,
  enroll cancels-existing-then-creates-new + denormalizes price, cancel,
  patient self-scope on `patientMembership`). Full unit suite 130
  suites / 2075 tests, `tsc --noEmit` clean, `eslint` clean. Full
  integration suite 9/9 suites / 432/432 tests, tenancy matrix green
  (after the domain-name fix above).
- Frontend: `detail.test.jsx` 18/18 (4 new), `manager/memberships/
  index.test.jsx` 3/3. `eslint` 0 errors across all touched files.
  `npm run build` clean; `npm run size` all 4 budgets green.
- Live (Chrome DevTools MCP, real dev stack): as `manager@medibook.dev`,
  created a real "Wellness Basic · ₹499/mo" plan on `/manager/memberships`
  — persisted, listed correctly. Opened real patient "Priya Patient"
  (`/patients/7ea9442e-...`), enrolled her via the dialog — chip updated
  to "Wellness Basic · ₹499.00/mo" — **reloaded the page and it was still
  there** (the old mock always reset to "No membership" on reload).
  Cancelled via the dialog — chip reverted to "No membership" — **also
  survived a reload**.

See `TR249` for the full recorded outcome.
