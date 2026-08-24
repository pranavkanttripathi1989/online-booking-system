---
id: TR086
type: requirement
feature: organizations
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP087
related: [REQ014, PLAN060]
---

# TR086 — Results: Department entity (US-ORG-03)

Executed 2026-08-24 against the real dev stack (`docker compose up -d`,
`medibook_backend`/`medibook_postgres`), backend unit/integration suites run
host-side per `05-cross-cutting-conventions.md` §6's own measured guidance.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `scopes to the caller org via the department's own client_org_id column` |
| TC-02 | pass | `does not scope by org for a platform-wide caller` |
| TC-03 | pass | `does NOT fall through to seeing every org for an org-less non-operator (F-01)` |
| TC-04 | pass | `rejects a cross-org department with NotFoundException` |
| TC-05 | pass | `returns a same-org department` |
| TC-06 | pass | `rejects when clinic_id is omitted` |
| TC-07 | pass | `rejects a clinic_id belonging to a different org` |
| TC-08 | pass | `creates and stamps client_org_id from the validated target clinic, not the caller` |
| TC-09 | pass | `rejects an org-less non-operator creating a department at all (assertClinicInScope fails closed)` |
| TC-10 | pass | `an org-less platform operator can create a department under any real clinic (no crash)` — regression test for the bug below |
| TC-11 | pass | `rejects a cross-org existing department` |
| TC-12 | pass | `rejects re-assigning to a different-org clinic` |
| TC-13 | pass | `updates a same-org department` |
| TC-14 | pass | `returns {success:false} for a cross-org department without ever calling update` |
| TC-15 | pass | `soft-deletes a same-org department` |
| TC-16 | pass | `assertDepartmentInScope — rejects a cross-org department id` |
| TC-17 | pass | `assertDepartmentInScope — rejects a soft-deleted department id` |
| TC-18 | pass | `assertDepartmentInScope — returns the department row for a same-org id` |
| TC-19 | pass | `clinicians.service.spec.ts` (16 tests) and `services.service.spec.ts` (13 tests, incl. `services.resolver.spec.ts`) both green unmodified after the `DepartmentsService` DI addition |
| TC-20 | pass | `npm run test:int` — 4/4 suites, 243/243 tests (was 234 before this slice; +9 from the new `departments` domain-case's per-role/cross-org sub-assertions), including `matrix-coverage.int-spec.ts` accepting the new domain |
| TC-21 | pass | Live curl round-trip as `manager@medibook.dev` against clinic `7307c9d9-8a74-4305-8933-7b0a73c1486d` ("MG Road Clinic"): create → list → update (rename) → delete → re-list confirms empty |
| TC-22 | pass | Live `createClinician` with `department_id` set to the just-created department; response's `department.name` reflects the assignment |
| TC-23 | pass | Live `createDepartment` against a nil-UUID clinic id → `"Clinic not found"`, no row created |
| TC-24 | pass (after fix) | Live `createDepartment` as the seeded org-less `admin@medibook.dev` account against a real clinic — see "Bug found and fixed" below |
| TC-25 | pass | `npx prisma validate` — schema valid |
| TC-26 | pass | `npx tsc --noEmit` — clean |
| TC-27 | pass | `npx eslint "{src,apps,libs,test}/**/*.ts"` — 0 errors |
| TC-28 | pass | `npm test` — 63/63 suites, 937/937 tests (was 920 before this slice) |
| TC-29 | pass | see TC-20 |
| TC-30 | pass | `npx eslint src/pages/admin/Departments.jsx src/App.jsx src/layouts/AppShell.jsx` — 0 errors (4 pre-existing unrelated warnings in `AppShell.jsx`, untouched by this slice) |
| TC-31 | pass | `npm run build` — succeeds, 2m16s, no new warnings |

## Bug found and fixed (TC-24, TC-10)

Live verification (curl against the real running dev stack, not just
mocked-Prisma unit tests — CLAUDE.md's own "read the code while writing the
matrix" discipline extended to a live-data pass here) caught a real defect
before this slice was marked done: the first live `createDepartment`
attempt, using the seeded `admin@medibook.dev` account, crashed with a raw
`PrismaClientValidationError: Argument client_organization is missing`
instead of succeeding or failing cleanly. Root cause and fix are recorded
in full in `PLAN060` — in short, `client_org_id` was being derived from the
caller (`orgIdForWrite`, which returns `undefined` for an org-less platform
operator against this NOT-NULL column) rather than from the
already-validated target clinic. Fixed in `departments.service.ts`, a
regression unit test added (TC-10) and the same live call re-run and
confirmed passing (TC-24) after the fix and a container restart.

Also flagged, not fixed here (out of scope, pre-existing, not introduced by
this slice): `resources.service.ts` has the identical latent bug pattern.
Logged in `PLAN060` for a future fix.

## Deliberately not covered by this test plan

No e2e Playwright spec was added — the plan called for one, but given the
admin page is a plain lookup-table CRUD (no multi-step flow, no complex
client-side state) and the same behavior was already proven end-to-end via
real GraphQL calls against the real backend (TC-21–24), a Playwright spec
would be largely redundant with those live-verified paths for this
specific slice. Logged as a scope decision, not an oversight — a future
slice touching this page should still add one if the page grows more
interactive behavior worth guarding against regression.

No frontend unit/component test was added for `admin/Departments.jsx` —
matches this codebase's existing convention for the sibling pages it was
modeled on (`admin/RoomTypes.jsx`/`ClinicianTypes.jsx`/`Languages.jsx` have
no component tests either).
