---
id: PLAN060
type: requirement
feature: organizations
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ014
related: []
---

# PLAN060 — Implementation plan: Department entity (US-ORG-03)

## Scope, and why it's narrower than REQ014's full story list

`REQ014` names six user stories. Cross-checked against the real code before
planning (not assumed from the requirement doc's 2026-08-22 "current state"
section, which predates two days of later shipments):

- **`US-ORG-04`** (generic bookable `Resource` entity, distinct from `Room`)
  is **already fully built** — `backend/src/resources/` (REQ017, shipped
  2026-08-24 earlier the same day), including real multi-resource
  intersection-booking conflict detection via `AppointmentResources`. Not
  touched here.
- **`US-ORG-01`/`US-ORG-02`** (self-serve trial signup, real onboarding
  wizard backend) were already shipped by `REQ045` (2026-08-23).
- **`US-ORG-05`** (masters cascade) and **`US-ORG-06`** (data migration
  tooling) are P1 in the requirement's own phase assignment — deferred, not
  silently dropped.

Only **`US-ORG-03`** (Department entity: specialty grouping so clinicians
and services can be organized/reported by department) was genuinely open
and P0. This slice builds exactly that.

## Files touched

- `backend/prisma/schema.prisma` — new `Departments` model; `department_id`
  added to `Clinicians` and `Products`; `departments` relation added to
  `ClientOrganizations` and `Clinics`.
- `backend/prisma/migrations/20260825000000_departments/migration.sql`
  (new, hand-written SQL per `medibook-prisma-migrations` — `prisma migrate
  dev` cannot run non-interactively here). **Known cosmetic issue**: the
  migration folder is dated one day ahead of the actual session date
  (2026-08-25 vs. the real 2026-08-24) — a naming slip, already applied to
  the dev database's `_prisma_migrations` table by the time it was
  noticed. Not corrected, since renaming now would require manually editing
  `_prisma_migrations` rows across the dev and e2e databases (and any
  dumps) to keep them in sync with the renamed file — real risk for a
  purely cosmetic issue with no functional effect. Future migrations this
  session use correct dates.
- `backend/src/departments/` (new module) — `departments.module.ts`,
  `departments.resolver.ts`, `departments.service.ts`,
  `departments.service.spec.ts`, `dto/department.input.ts`,
  `entities/department.entity.ts`. Scaffolded to match
  `backend/src/resources/`'s exact file layout and scoping pattern (owns
  `client_org_id` directly, not via a clinic relation like Rooms).
- `backend/src/app.module.ts` — registers `DepartmentsModule`.
- `backend/src/clinicians/{clinicians.module.ts,clinicians.service.ts,
  clinicians.service.spec.ts,dto/clinician.input.ts,
  entities/clinician.entity.ts}` — optional `department_id` on create/update,
  validated via Hard Rule 6 (`assertDepartmentInScope`), exposed on the
  GraphQL entity.
- `backend/src/services/{services.module.ts,services.service.ts,
  services.service.spec.ts,dto/service.input.ts,
  entities/service.entity.ts}` — identical treatment for the Products/
  Service domain.
- `backend/test/integration/setup/{fixture.ts,domain-cases.ts}` — new
  `departmentA`/`departmentB` fixture rows and a `departments`
  tenancy-matrix domain-case entry (Hard Rule: a new resolver domain
  without a matrix row fails `matrix-coverage.int-spec.ts` by design).
- `frontend/src/pages/admin/Departments.jsx` (new) — single-file lookup-
  table CRUD page. Deliberately modeled on `admin/RoomTypes.jsx` (a simple,
  theme-token-only, single-file admin lookup page), not
  `manager/clinics/index.jsx` (richer, but laden with hex-literal styling
  and a legacy mock-fallback layer that Hard Rule 5 and "no page ships
  rendering data it didn't fetch" both argue against reproducing in new
  code) — a closer structural fit for a plain specialty-grouping lookup
  table than for a rich multi-tab domain object page.
- `frontend/src/App.jsx` — lazy import + route for `/admin/departments`,
  under the existing `roles={['admin', 'super_admin']}` guard (matching
  `room-types`/`languages`'s precedent exactly). Note: the backend resolver
  is slightly broader (`manager` can also read/write, matching Resources'
  own gating) — a deliberate, minor frontend-narrower-than-backend choice,
  not a bug; can be widened later without a backend change if an Org Admin
  wants managers to self-serve this.
- `frontend/src/layouts/AppShell.jsx` — new `CategoryIcon` import,
  "Departments" nav entry under `ADMIN_CHILDREN`.

## Deliberately not built this slice

Department picker UI inside `CreateClinicianPage.jsx`/`EditClinicianPage.jsx`
and the equivalent service create/edit forms — the plan originally called
for this, but those forms use react-hook-form + zod (materially more
integration work per form than the plain controlled-form pattern used
elsewhere), and the backend already fully accepts/validates/persists
`department_id` on both domains (live-tested). Scoped out to preserve
budget for the other four slices in this session's pass; the Departments
admin page itself is fully functional standalone. Logged here as open, not
silently dropped — a future `PLAN###` should add the picker to those two
forms plus the two service forms.

## A real bug found and fixed during live verification

Live-tested via real GraphQL calls against the dev stack (not just unit
tests) before considering this slice done. The first `createDepartment`
attempt — using the seeded `admin@medibook.dev` account, which per
`CLAUDE.md`'s own seed notes is deliberately unlinked (`client_org_id:
null`) — crashed with a raw Prisma `PrismaClientValidationError: Argument
client_organization is missing`, not a clean error.

Root cause: the original `create()` (copied faithfully from
`resources.service.ts`'s established pattern) stamped `client_org_id:
orgIdForWrite(user, 'Department') as string`. For a platform operator
(admin/super_admin) with no org of their own, `orgIdForWrite` returns
`undefined` — fine for a nullable-`client_org_id` model, but `Departments`
(like `Resources`) has a required column, so Prisma's type validation
rejects the `undefined` before the query ever reaches the database,
surfacing as an opaque 500 instead of a clean 400.

A second, more serious variant of the same root cause was found by
inspection (not live-reproduced, since it needs a platform operator who
*does* have their own org set, an edge case not present in seed data):
`orgIdForWrite` stamps the **caller's** org, but `assertClinicInScope`
allows a platform operator to target *any* clinic regardless of org. A
platform operator with their own org set could therefore create a
Department whose `client_org_id` disagrees with its own `clinic.
client_org_id` — silent data corruption, not a crash.

**Fix**: derive `client_org_id` from the already-validated target clinic
(`assertClinicInScope`'s own return value) instead of from the caller.
This is strictly more correct for both variants — a Department's org must
always agree with its own clinic's org by construction, regardless of who
created it or what org (if any) they happen to belong to. Fixed only in
`departments.service.ts` (this slice's own new file); `resources.service.ts`
has the identical latent bug but was NOT touched — out of scope for this
slice, flagged here for a future fix rather than silently left
undiscovered.

## Test plan

See `TP087`.

## Test results

See `TR086` — pass.
