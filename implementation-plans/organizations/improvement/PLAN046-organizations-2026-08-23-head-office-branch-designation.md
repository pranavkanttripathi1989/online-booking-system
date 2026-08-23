---
id: PLAN046
type: improvement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ041
related: [REQ014]
---

# PLAN046 — Head-office branch designation

## Design

Grounded in a real-code exploration pass: `Clinics.client_org_id` already
gives a one-level org→clinics hierarchy (indexed, org-scoped in
`findAll`/`findOne`/`create`/`update`); `Clinics.is_primary` existed but was
dead weight — no migration was checked in that added it any behavior, and
`clinics.service.ts` never referenced it.

- Migration `20260823040000_clinics_one_primary_per_org` — partial unique
  index, applied via `prisma migrate deploy` (no `prisma generate` needed;
  `is_primary` was already a typed field on the Prisma Client).
- `ClinicsService.setHeadOffice()` — `findOne()` first for tenant scoping,
  then (for an org-linked clinic) a `$transaction`: `updateMany` to unset
  any existing primary in the same org, then `update` the target. For an
  org-less clinic, skips straight to the single `update` — see `REQ041`
  for why unsetting other org-less clinics as a group would be wrong.
- `ClinicsResolver.setHeadOfficeClinic` — same role gate as sibling
  clinic-write mutations.
- Frontend: `CLINICS_QUERY` gains `is_primary`; `SET_HEAD_OFFICE_CLINIC_MUTATION`
  added; `manager/clinics/index.jsx`'s `toCardClinic()` passes `is_primary`
  through (`undefined` for a mock row, never a false "not head office");
  card UI gets a star badge + action button gated on a strict
  `=== false` check.

## Verification

Unit: 3 new `clinics.service.spec.ts` cases (unset-then-set within an org,
skip-unset for an org-less clinic, cross-tenant rejection). Full backend
suite 719/719 green, `tsc --noEmit`/`eslint` clean. Frontend `eslint`
clean, full Jest suite 63/63 unaffected. Live, against the real dev
database: set MG Road Clinic as head office (confirmed `is_primary: true`
in the mutation response and via `psql`), switched to Admin Test Clinic
(confirmed MG Road's flag correctly unset in the same operation), then
attempted to force a second `is_primary=true` row in the same org directly
via raw SQL — rejected by the partial unique index
(`duplicate key value violates unique constraint
"clinics_one_primary_per_org"`), proving the invariant holds even against a
bypass of the application layer entirely. Test data reset to its original
state afterward. See `TR072`.
