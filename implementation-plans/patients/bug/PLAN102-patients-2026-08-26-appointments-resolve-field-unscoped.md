---
id: PLAN102
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: done
parent: BUG025
related: []
---

# PLAN102 — Implementation plan for the `Patient.appointments` scoping fix (F-05)

No schema change. `patients.resolver.ts#appointments()` gained
`@CurrentUser() user: JwtPayload`, passed through to
`patients.service.ts#appointments(patientId, first, page, user)`.

New private `appointmentSelfScope(user)` on `PatientsService` — mirrors
`appointments.service.ts`'s own `selfScope()` clinician branch only
(`{clinician_id: user.clinician_id ?? '__no_clinician_link__'}` for a
clinician caller, `{}` otherwise). Deliberately does not repeat the
patient branch — see `BUG025`'s own comment on why a second
caller-derived `patient_id` filter here would break the dependant case
instead of restricting it. Combined with `orgScopeVia(user, 'clinic')`
in the `where` clause (import added to `patients.service.ts`'s existing
`common/scoping/tenant-scope` import line, alongside `orgScope`/
`orgIdForWrite`/`assertSameOrg` added for `BUG024` in the same pass).

## Testing (see `TP129`)

4 new cases in `patients.service.spec.ts` (same file, same pass as
`BUG024`): org-scoping via the clinic relation, clinician self-scope,
confirms no patient-id narrowing breaks the dependant case, no filter
for a platform operator.

## Live verification

`patient(id: <Anita Sharma>) { appointments { paginatorInfo { total }
data { id status } } }` as `manager@medibook.dev` returned `total: 2`,
matching the real DB count exactly.
