---
id: CTX-organizations-2026-08-24-req014
type: requirement
feature: organizations
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ014
related: [PLAN060, TP087, TR086]
---

# organizations — REQ014 slice: Department entity (US-ORG-03) (2026-08-24)

First of five PRD-derived requirement slices picked and built in one pass
(REQ014 → REQ029 → REQ025 → REQ016 → REQ023), selected by cross-checking
`project-plans/07-prd-gap-analysis-and-roadmap.md`'s remaining Phase G/H
candidates against the real, current code before committing to scope — see
this session's plan file for the full selection rationale.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ014 | [multi-branch org hierarchy, onboarding wizard, and data migration](../../requirements/organizations/requirement/REQ014-organizations-2026-08-22-multi-branch-hierarchy-and-onboarding.md) |
| implementation-plans | PLAN060 | [Department entity (US-ORG-03)](../../implementation-plans/organizations/requirement/PLAN060-organizations-2026-08-24-department-entity.md) |
| test-plans | TP087 | [verification plan](../../test-plans/organizations/requirement/TP087-organizations-2026-08-24-department-entity.md) |
| test-results | TR086 | [verification results — pass](../../test-results/organizations/requirement/TR086-organizations-2026-08-24-department-entity.md) |

## What shipped

- Schema: `Departments` (own `client_org_id` + `clinic_id`, matching
  `Resources`' precedent), optional `department_id` on `Clinicians` and
  `Products`.
- Backend: new `backend/src/departments/` module (full CRUD, tenant-scoped,
  Hard Rule 6 create-path clinic validation), wired as an optional FK into
  `clinicians.service.ts`/`services.service.ts`'s create/update paths.
- Frontend: new `admin/Departments.jsx` lookup-table CRUD page, routed at
  `/admin/departments`, nav entry added.
- Tests: 18 new backend unit tests, `clinicians`/`services` suites updated
  for the new DI dependency, a new tenancy-matrix `departments` domain-case
  entry (+9 integration tests).

## Real finding from this slice

Live curl verification against the real dev stack (not just mocked-Prisma
unit tests) caught a genuine bug before this slice was marked done: an
org-less platform operator (the seeded `admin@medibook.dev` account)
crashed with a raw Prisma validation error creating a Department, because
`client_org_id` was derived from the caller (`orgIdForWrite`) rather than
the already-validated target clinic. Fixed by deriving from the clinic
instead — strictly more correct, and also closes a second, non-crashing
variant (a platform operator with their *own* org could otherwise create a
Department whose org disagreed with its own clinic's org). Full account in
`PLAN060`. The identical latent bug exists in `resources.service.ts` too —
flagged, not fixed (out of scope for this slice).

## What's deliberately not built yet

- `US-ORG-04` (generic bookable `Resource` entity) — turned out to already
  be fully built by `REQ017`, discovered during this slice's own research
  pass before any code was written.
- Department picker UI inside the clinician/service create/edit forms
  (react-hook-form + zod, more integration work per form) — the backend
  fully supports `department_id` on both domains already (live-tested);
  the picker itself is scoped out to preserve budget for the other four
  slices in this pass.
- `US-ORG-05` (masters cascade) and `US-ORG-06` (data migration tooling) —
  both P1 in `REQ014`'s own phase assignment, untouched.
- `US-ORG-01`/`US-ORG-02` — already shipped by `REQ045` (2026-08-23),
  confirmed still current, not re-verified beyond that confirmation.

## Next in this pass

REQ029 (analytics true-utilisation fix + tenancy-matrix coverage).
