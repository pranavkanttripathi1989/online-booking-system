---
id: PLAN104
type: bug
feature: test-results
created: 2026-08-26
updated: 2026-08-26
status: done
parent: BUG027
related: []
---

# PLAN104 — Implementation plan for `orderTest`'s `patient_id` fix (F-08)

No schema change (`TestResults.patient_id` was already a nullable
column, just never written).

## Changes

**`dto/order-test.input.ts`**: added `patient_id: String` (required,
`@IsNotEmpty()`), ahead of the existing `patient`/`testType` fields.

**`test-results.service.ts#orderTest`**: fetches `prisma.patients
.findUnique({where:{id: input.patient_id}})`, `BadRequestException` if
missing/deleted, `assertSameOrg(user, patient.client_org_id, 'Patient')`
(imported alongside the module's existing `isPlatformOperator`/
`orgScopeVia`). Write gains `patient_id: input.patient_id`.

**`pages/test-results/index.jsx`**: `orderForm` state gained
`patientId`; new `PATIENTS_QUERY`-backed `Autocomplete` (imported from
`graphql/queries.js`, already used by `BookingStep4Patient.jsx` for the
identical pattern — `search`/`first` variables, `network-only`,
`getOptionLabel`/`isOptionEqualToValue` matching that component
verbatim). `handleOrderSubmit` sends `{patient_id, patient, testType}`;
Submit button now disables on missing `patientId` rather than a trimmed
free-text string.

## Testing (see `TP131`)

`test-results.service.spec.ts` extended — 4 new cases under a new
`orderTest` describe block (this method had **no** existing test
coverage at all before this pass): unknown patient rejected, cross-org
patient rejected (Hard Rule 6), `patient_id` written on the created row,
a platform operator can order for a patient with no `client_org_id` yet.

## Live verification

`orderTest` with a real `patient_id` against the dev DB — confirmed via
direct SQL that `patient_id` was correctly written on the new
`TestResults` row. `orderTest` with `patient_id` omitted — rejected by
GraphQL schema validation itself (`Field "OrderTestInput.patient_id" of
required type "String!" was not provided`), before ever reaching the
resolver.
