---
id: PLAN177
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ137
related: [TP197, TR197]
---

# PLAN177 — Implementation plan: auto-attach a claim's issued prescriptions as evidence

## Change

No schema change — the join path (`Claims.appointment_id` →
`Encounters.appointment_id` → `Prescriptions.encounter_id`) already
exists via existing FKs.

**`backend/src/prescriptions/prescriptions.service.ts`**: new public
`prescriptionsForEncounter(encounterId: string)` — `prisma.prescriptions
.findMany({where: {encounter_id: encounterId}, include: {items: true},
orderBy: {issued_at: 'desc'}})`, then maps each row's items through the
existing private `itemsToGraphQL()` (drug name resolution, already used
by `prescription()`). Placed directly above `loadPrescriptionForUser`
with a comment noting access control is the caller's responsibility —
this method takes an already-authorized encounter id, not a raw
user-supplied one.

**`backend/src/insurance/insurance.service.ts`**: constructor now also
injects `PrescriptionsService`. New `claimEvidencePrescriptions(claimId,
user)` — reuses the existing `loadClaimForUser(claimId, user)` (identical
access control to `claim()`), then `prisma.encounters.findUnique({where:
{appointment_id: claim.appointment_id}})`; returns `[]` if no encounter
exists yet, otherwise delegates to
`prescriptionsService.prescriptionsForEncounter(encounter.id)`.

**`backend/src/insurance/insurance.module.ts`**: imports
`PrescriptionsModule` (already exports `PrescriptionsService` — the same
reuse pattern `documents.module.ts` established for `REQ057`). No
circular dependency: `PrescriptionsModule` does not import
`InsuranceModule`.

**`backend/src/insurance/insurance.resolver.ts`**: new
`claimEvidencePrescriptions(claim_id: ID!): [Prescription!]!` query,
same `@Auth('staff', 'manager', 'admin', 'super_admin')` gate as
`claims()`/`claim()` — read-only evidence for a claim the caller can
already view, no higher trust bar needed.

## Implementation note — resolve-field vs. flat query

The batch plan's own phrasing described this as "a read-only
resolve-field." `InsuranceResolver` is a single `@Resolver()` class
serving five different GraphQL types (`Payer`, `PayerEmpanelment`,
`PatientInsurancePolicy`, `PayerTariff`, `Claim`) with no per-type
`@Resolver(() => X)` split — introducing a `@ResolveField()` on `Claim`
would require either splitting the class or fighting NestJS's
type-inference (which resolves the parent type from the class-level
`@Resolver(() => X)` decorator, absent here). A flat `claimEvidencePrescriptions(claim_id)`
query matches this resolver's own existing convention exactly
(`submitClaim`/`claims`/`claim`/`updateClaimStatus` are all flat), so
that's what was built — functionally identical from the frontend's
perspective (a query keyed by claim id), just not a GraphQL-level
resolve field on `Claim` itself.

## Testing

`backend/src/prescriptions/prescriptions.service.spec.ts`: 2 new cases
— fetches by `encounter_id`, newest first, and maps `drug_name` onto
each item; returns `[]` for an encounter with no prescriptions.

`backend/src/insurance/insurance.service.spec.ts`: 3 new cases — rejects
a cross-org claim before ever querying encounters (same access control
as `claim()`); returns `[]` when the appointment has no encounter yet,
without calling `PrescriptionsService`; looks up the encounter by the
claim's own `appointment_id` and delegates to
`prescriptionsService.prescriptionsForEncounter(encounter.id)`.

Full backend unit suite: 92/92 suites, 1544/1544 tests (5 new).
Integration suite: 4/4 suites, 387/387 unchanged — no schema change, no
new tenancy-matrix row needed (`insurance` domain already classified via
`payerEmpanelments`; this new query reuses the identical
`loadClaimForUser` access control already exercised by `claims`/`claim`'s
own coverage and by this slice's own cross-org unit test).
`tsc --noEmit`/`eslint` clean.

## Documentation

`REQ137` (this requirement), `PLAN177` (this plan), `TP197`/`TR197`
(verification), a context bundle, and index updates across all five doc
roots plus the `insurance-claims` feature README.
