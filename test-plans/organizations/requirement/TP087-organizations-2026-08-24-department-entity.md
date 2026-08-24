---
id: TP087
type: requirement
feature: organizations
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ014
related: [PLAN060]
---

# TP087 — Test plan: Department entity (US-ORG-03)

Direct test-plan against an already-proven pattern (matches
`resources.service.ts`'s own shape exactly) — suggestion stage skipped per
`CLAUDE.md`'s working loop step 4.

## Unit — `departments.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | Caller scoped to `org-a` | `findAll` | `where` filters on the department's own `client_org_id` |
| TC-02 | Platform-wide caller (admin/super_admin) | `findAll` | No org filter applied |
| TC-03 | Org-less non-operator (self-registered-account shape, F-01) | `findAll` | Falls back to a sentinel filter that matches nothing, never `{}` |
| TC-04 | A department belonging to a different org | `findOne` | `NotFoundException` |
| TC-05 | A same-org department | `findOne` | Returns it |
| TC-06 | `create` input with no `clinic_id` | `create` | `BadRequestException`; `departments.create` never called |
| TC-07 | `clinic_id` belongs to a different org | `create` | `BadRequestException`; `departments.create` never called |
| TC-08 | Valid same-org `clinic_id` | `create` | `client_org_id` stamped from the **validated clinic**, not the caller (see PLAN060's found-bug writeup) |
| TC-09 | Org-less non-operator | `create` | Rejected via `assertClinicInScope`'s own fail-closed check |
| TC-10 | Org-less platform operator, real clinic | `create` | Succeeds, using the clinic's own org — regression test for the live-found bug |
| TC-11 | Cross-org existing department | `update` | `NotFoundException`; `departments.update` never called |
| TC-12 | Re-assigning to a different-org clinic | `update` | `BadRequestException`; `departments.update` never called |
| TC-13 | Same-org department | `update` | Succeeds |
| TC-14 | Cross-org department | `remove` | `{success:false}`, `departments.update` never called (no throw) |
| TC-15 | Same-org department | `remove` | Soft-deletes, `{success:true}` |
| TC-16 | Cross-org department id | `assertDepartmentInScope` (reused by clinicians/services) | `BadRequestException` |
| TC-17 | Soft-deleted department id | `assertDepartmentInScope` | `BadRequestException` |
| TC-18 | Same-org department id | `assertDepartmentInScope` | Returns the row |

## Unit — `clinicians.service.spec.ts` / `services.service.spec.ts` (existing suites, DI updated)

| Case | Given | When | Then |
|---|---|---|---|
| TC-19 | `DepartmentsService` mock injected | Existing suites re-run | All pre-existing cases still pass unmodified (no `department_id` in any existing fixture, so the mock is never actually invoked — present only so Nest DI resolves) |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-20 | New `departments` domain-case row (own `client_org_id`, mirrors `resources`' shape) added to `domain-cases.ts` | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; org-A caller sees `departmentA` never `departmentB`; role gating enforced |

## Live verification against the real dev stack (not just mocked-Prisma unit tests)

| Case | Given | When | Then |
|---|---|---|---|
| TC-21 | Real manager JWT, real clinic id | `createDepartment` → `departments` → `updateDepartment` → `deleteDepartment` via curl | Full round-trip succeeds; deleted row no longer listed |
| TC-22 | Real manager JWT | `createClinician` with `department_id` set to a real department | Returned `clinician.department` reflects the assignment |
| TC-23 | Real manager JWT, a different org's clinic id | `createDepartment` | `Clinic not found` (cross-tenant rejection, not silent success) |
| TC-24 | Real, deliberately org-less `admin@medibook.dev` seeded account | `createDepartment` against a real clinic | Succeeds (this is the regression case that caught the found bug — see PLAN060) |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-25 | `npx prisma validate` | Schema valid after the new model + two new FK columns |
| TC-26 | `npx tsc --noEmit` | No new errors |
| TC-27 | `npx eslint "{src,apps,libs,test}/**/*.ts"` | 0 errors, 0 new warnings |
| TC-28 | `npm test` (full suite) | All 63 suites green, including the new/updated ones |
| TC-29 | `npm run test:int` | All 4 suites green, including the new `departments` matrix coverage |
| TC-30 | Frontend `npx eslint src/pages/admin/Departments.jsx src/App.jsx src/layouts/AppShell.jsx` | 0 errors |
| TC-31 | Frontend `npm run build` | Succeeds, no new warnings from the new page |
