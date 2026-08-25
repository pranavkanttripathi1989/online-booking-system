---
id: PLAN101
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: done
parent: BUG024
related: []
---

# PLAN101 — Implementation plan for `Patients.client_org_id` (F-04)

## Schema

`Patients.client_org_id String?`, `client_organization ClientOrganizations?
@relation(...)`, `ClientOrganizations.patients Patients[]` back-relation,
`@@index([client_org_id])`. Migration
`20260825140000_patients_client_org_id` — column, FK, index, then the
backfill (`UPDATE ... FROM (SELECT DISTINCT ON (patient_id) ...
ORDER BY created_at ASC)`, identical shape to `20260821000000_products_
client_org_id`).

## Changes

**`patients.service.ts`**: removed the local `orgScope()` private method
entirely (relation-fallback escape hatch), replaced its one call site in
`findAll()` with the imported `orgScope(user)`. `findOne()` restructured
into early-return branches per caller shape — see `BUG024`'s own account
of why stacking `assertSameOrg()` on top of the patient/clinician
identity checks would have been a regression. `create()` now takes
`user: JwtPayload`, stamps `client_org_id: orgIdForWrite(user, 'Patient')`.

**`patients.resolver.ts`**: `createPatient` threads `@CurrentUser()`.

## Testing (see `TP128`)

`patients.service.spec.ts` extended — 13 new cases: `findAll`/`findOne`
org-scoping (including the "predates any appointment" null-org-id edge
case for a patient viewing their own record), `create()`'s org stamp and
org-less-caller rejection. All 25 pre-existing cases re-verified passing
unchanged (one fixture updated: `mergePatients`'s own `findUnique` mock
needed a `client_org_id` added, since it calls `findOne()` internally).

## Live verification

`patients(first: 5)` as `manager@medibook.dev` returned `total: 112` —
the exact predicted post-fix count from the blast-radius check.
`createPatient` for a new test patient, confirmed via direct SQL that
`client_org_id` was correctly stamped to the caller's own org.
