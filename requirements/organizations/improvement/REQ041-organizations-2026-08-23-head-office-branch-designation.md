---
id: REQ041
type: improvement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ014
related: []
---

# REQ041 — Designate and enforce a head-office branch per organization

First vertical slice of `REQ014` (multi-branch org hierarchy and onboarding)
— not the full PRD scope (departments/resources cascading under a clinic,
the onboarding-wizard rework, service-master inheritance).

## Why this slice

`REQ014`'s own PRD hierarchy is `PLATFORM → ORGANIZATION → BRANCH →
DEPARTMENT/ROOM/RESOURCE`. `project-plans/technical-plans/01-phase1-mvp.md`
already settles the biggest ambiguity: *"a 'branch' IS a Clinic here... use
'branch' only in UI copy"* — so the org→branch level of the hierarchy
already exists (`Clinics.client_org_id`, indexed, org-scoped throughout).
What was missing was the "head office" concept the PRD hierarchy implies:
`Clinics.is_primary` existed in the schema since before this session but
was never read or written by any service, so nothing prevented two clinics
in the same org from both being (or neither being) the head office.

## What was built

- New migration `20260823040000_clinics_one_primary_per_org`: a partial
  unique index — `UNIQUE (client_org_id) WHERE is_primary = true AND
  is_deleted = false` — enforcing the invariant at the database level, not
  just in application code (matching this session's own established
  preference, e.g. `BUG017`'s exclusion constraints, for a DB-level
  guarantee over a code-only convention).
- `ClinicsService.setHeadOffice(id, user)`: tenant-scoped (via the existing
  `findOne`), unsets any other `is_primary=true` clinic in the same org
  before setting the target — except for an org-less clinic, where the
  unset step is skipped entirely (Postgres treats every `NULL` as distinct
  in a unique index, so org-less clinics were never sharing one slot to
  begin with; unsetting them as a group would be a new, incorrect
  behavior, not a faithful reading of the existing schema).
- `ClinicsResolver.setHeadOfficeClinic` mutation, same
  `@Auth('manager','admin','super_admin')` gate as `createClinic`/`updateClinic`.
- `ClinicType.is_primary` exposed on the GraphQL entity.
- `manager/clinics/index.jsx`: a star badge next to a clinic's name when
  it's the head office, and a "Set as head office" action on every other
  real clinic card (`clinic.is_primary === false`, a strict check that
  never fires for the page's own mock-data fallback rows, which have no
  such field at all).

## What this does not do

- No `Departments`/`Resources` tables (the rest of `REQ014`'s hierarchy) —
  separate, larger scope.
- No onboarding-wizard changes — a new clinic still defaults to
  `is_primary: false`; promoting it to head office is a separate, explicit
  action, not automatic on creation.
- No service-master inheritance cascade.
- No dedicated e2e Playwright spec for this specific slice — the DB
  constraint and service logic are covered by real unit tests plus a live,
  end-to-end manual verification (mutation call → DB row change → DB
  constraint rejecting a bypass attempt), and the frontend change is a
  small, low-risk UI addition to an already-mixed-fallback page. Logged as
  a deliberate scope decision, not a silent gap.
