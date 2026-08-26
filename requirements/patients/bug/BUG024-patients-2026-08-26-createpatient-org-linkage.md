---
id: BUG024
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# BUG024 — `Patients` had no `client_org_id`; a zero-appointment patient was visible cross-org

## Source

Part of a 10-finding pick-up from `project-plans/analysis/02-findings-register.md`
(the original 2026-08-22 codebase audit), `F-04`. Re-verified against the
current code before starting, since ~30 slices have shipped since the
finding was written — confirmed still fully open.

## The bug, precisely

`Patients` had no `client_org_id` column at all. `patients.service.ts`'s
`orgScope()` fell back to `{OR: [{appointments: {some: {clinic:
{client_org_id}}}}, {appointments: {none: {}}}]}` — a patient with zero
appointments (freshly registered, before their first booking) matched the
second branch and was visible to **any authenticated staff caller in any
org**, not just their own. `createPatient` also took no `@CurrentUser()`
at all, so a newly created patient had no org linkage to begin with —
every patient was in this leaky state until their first appointment.

## Fix, following `BUG001`'s exact precedent

`BUG001` (`Products.client_org_id`) hit the identical shape a session
earlier — reused its migration pattern exactly, reversed direction:

- `Patients.client_org_id String?` (nullable), with a real
  `ClientOrganizations` relation and a `@@index`.
- New migration backfills `client_org_id` from each patient's own
  appointment history (`Appointments.clinic.client_org_id`) — a real
  `Patients` row with real bookings keeps working unchanged. Rows with no
  appointment history stay `null` (visible only to platform operators,
  the same default this schema uses everywhere for records that predate
  an org linkage).
- `orgScope()` now uses the shared `orgScope(user)` helper
  (`common/scoping/tenant-scope.ts`) against the direct column, replacing
  the relation-fallback escape hatch entirely.
- `findOne()` restructured so each role branch (patient's own/dependant
  record, clinician's treated-patient record) returns directly after its
  own identity-based check — the general `assertSameOrg()` check is
  reserved for the one caller shape with no identity proof of its own
  (staff/manager/admin/super_admin). Stacking the org check on top of the
  identity checks would have locked a patient out of their own profile
  whenever it predates any appointment history (`client_org_id: null`).
- `createPatient` now threads `@CurrentUser()` and stamps
  `orgIdForWrite(user, 'Patient')`.

## Blast-radius check before migrating (matching `BUG001`'s own discipline)

Measured against the real dev DB before applying: 137 real patients, 112
with real appointment history (all at the one seeded org with data), 25
without. Confirmed the manager account currently sees all 137 (the
leak); after the fix, the same manager sees exactly 112 — the 25 that
disappear are exactly the zero-appointment leak this fix closes, not a
regression on legitimate data.

## Acceptance criteria (Given/When/Then)

- **Given** a patient with real appointment history at the caller's own
  org, **when** the caller lists or reads patients, **then** it's
  visible, unchanged from before the fix.
- **Given** a patient with zero appointment history (or belonging to a
  different org), **when** a staff/manager/admin caller (not a platform
  operator) reads it, **then** it's not found.
- **Given** a patient reading their own (or a genuine dependant's)
  record with no `client_org_id` yet, **then** they can still see it —
  the identity check alone is sufficient proof.
- **Given** a new patient created through `createPatient`, **then** its
  `client_org_id` is stamped from the caller's own JWT.

## Traceability

`project-plans/analysis/02-findings-register.md` F-04.
