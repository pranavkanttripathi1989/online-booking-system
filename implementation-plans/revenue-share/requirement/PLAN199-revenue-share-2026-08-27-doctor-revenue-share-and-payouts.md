---
id: PLAN199
type: requirement
feature: revenue-share
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ158
related: [REQ158, TP219, TR219]
---

# PLAN199 — Doctor revenue-share & payouts engine (P2-06)

## Schema

- `backend/prisma/schema.prisma` — two new models:
  - `RevenueShareRules` — `client_org_id`, `scope` (`org`/`clinic`/
    `clinician`), nullable `clinic_id`/`clinician_id`, `share_percentage`
    (`Float`, 0-100), `created_by_user_id`. No DB-level uniqueness across
    the nullable scope columns (Postgres treats `NULL` as distinct per
    row) — "at most one rule per scope key" is a service-layer invariant,
    enforced by find-then-upsert, the same division of labour
    `setPayerTariff` already uses for its own natural key.
  - `Payouts` — one row per clinician per clinic per calendar month.
    `share_percentage_used`/`gross_amount` are snapshots at computation
    time, deliberately independent of `RevenueShareRules` going
    forward. `@@unique([clinician_id, clinic_id, period_start])`.
- Back-relations added to `ClientOrganizations`, `Clinics`, `Clinicians`
  (`revenueShareRules`, `payouts` on each).
- `backend/prisma/migrations/20260827200000_revenue_share_and_payouts/migration.sql`
  — hand-written: two `CREATE TABLE`s, their indexes, and five FKs. Read
  end-to-end against the schema diff before applying.

## Backend — `backend/src/revenue-share/`

- `revenue-share.service.ts` exports `resolveRevenueShare()` — a small
  pure function, not a Prisma query, mirroring
  `resolveServicePrice()`'s own most-specific-wins cascade
  (`common/pricing/resolve-price.ts`, REQ055/REQ100): clinician-level
  rule → clinic-level rule → org-level default → `null`. Cheap to unit
  test against an already-fetched rule list, same shape as the pricing
  precedent it's modelled on.
- `setRevenueShareRule()` — Hard Rule 6: validates a caller-supplied
  `clinic_id`/`clinician_id` belongs to the caller's org via
  `assertClinicInScope`/`assertClinicianInScope` before writing (the
  same helper shape `departments.service.ts`'s own `assertClinicInScope`
  established). Find-then-upsert on the exact scope key.
- `computeMonthlyPayouts()` — sums succeeded `AppointmentPayments` for
  the given clinic/month (net of `discount_amount`), grouped by the
  paying appointment's `clinician_id` (joined through
  `appointment: {select: {clinician_id: true}}`, since
  `AppointmentPayments` has no direct `clinician_id` column). Resolves
  each clinician's rate via `resolveRevenueShare()`; a clinician with no
  resolvable rule is skipped and named in `skippedClinicianNames` rather
  than silently dropped or defaulted. **Never overwrites a `status:
  'approved'` row** (US-REV-03) — only a `pending_approval` row is
  recomputed in place, matching `ClaimAppeals`' own "re-rejection
  regenerates the draft in place" precedent for a still-open state.
- `approvePayout()` — `assertSameOrg` then stamp `approved_by_user_id`/
  `approved_at`; idempotent (approving an already-approved payout is a
  no-op, not a re-stamp).
- `revenue-share.resolver.ts` — `@Auth('manager', 'admin', 'super_admin')`
  on every handler, matching `departments`/`services`/`insurance`'s own
  gate (not admin/super_admin-only — CLAUDE.md's own Phase G+2 finding:
  an admin-only gate makes a domain's own `isSameOrg()` check
  unreachable dead code, since `isPlatformOperator()` treats every
  admin/super_admin as platform-wide unconditionally).
- `app.module.ts` — registered `RevenueShareModule`. This file is
  concurrently owned by other in-flight work in this session (a
  `TasksModule` addition); the registration landed via this session's
  own established technique — a clean patch built from `HEAD` applied
  with `git apply --cached` to stage only this slice's hunk, with the
  actual working-tree file edited directly (not just the index) so both
  modules are genuinely registered and the app compiles/runs correctly
  regardless of git staging state.

## A real scope correction (see REQ158's own account)

The phase doc's "per-branch" framing assumed a clinician could have
different rates at different branches simultaneously. `Clinicians.clinic_id`
is a single scalar field, not a many-to-many relation — checked and
confirmed via a full-schema grep before writing any code. Reinterpreted
as a rate-*resolution hierarchy* instead (the `resolveServicePrice()`
pattern), which delivers the real underlying need ("this branch's
default is 55%; one doctor negotiated 65%") without fabricating a schema
relation that doesn't exist.

## Frontend — `frontend/src/pages/manager/revenue-share/index.jsx`

Desktop-dense tier. `client.query`/`client.mutate` via
`useApolloClient()`, inline `gql`, matching `manager/reports/index.jsx`'s
own convention (not the canonical `graphql/*.js` files — this is a new
domain with no existing canonical-dialect operations to conflict with).

- A required Clinic selector (`SURF-14`'s persistent branch-scope
  indicator) — no "All clinics" option, since every payout run needs a
  concrete `clinic_id`.
- Share Rules card: a form (scope/doctor/percentage) + a table of
  current rules for the selected clinic (org default, this clinic's
  override, any doctor-level overrides).
- Monthly Payout Run card: Month/Year pickers, a "Run Payouts" button
  (`computeMonthlyPayouts`), a per-doctor result table with a per-row
  "Approve" action, and an "Export CSV" button (`SURF-8`) building the
  CSV client-side and downloading via a `Blob`/`<a download>`, the exact
  pattern `finances/index.jsx`'s own `handleExport` already uses.
- Route: `/manager/revenue-share` in `App.jsx`, inside the existing
  `admin`/`super_admin`/`manager` `RoleGuard` block (matches the backend
  `@Auth` gate — `SEC-18`). Nav entry in `AppShell.jsx`'s
  `MANAGER_CHILDREN`.

## Testing

- `revenue-share.service.spec.ts` — `resolveRevenueShare()`'s cascade
  (5 cases), Hard Rule 6 cross-org rejection on both `clinic_id` and
  `clinician_id`, upsert-vs-create, `computeMonthlyPayouts`'s grouping/
  skip/never-overwrite-approved behaviour, `approvePayout`'s cross-org
  rejection (masked as `NotFoundException`, per `assertSameOrg`'s own
  convention) and idempotency.
- `revenue-share.resolver.spec.ts` — `@Auth` gate on every handler,
  pure-delegation checks.
- `frontend/src/pages/manager/revenue-share/index.test.jsx` — load
  state, save-a-rule round trip, run-payouts round trip, approve round
  trip, `MockedProvider` against re-declared gql ASTs.

## Documentation

`REQ158`, this `PLAN199`, `TP219`/`TR219`, a context bundle, and all
five root indexes plus a new `revenue-share` feature README, matching
every prior slice this session.
