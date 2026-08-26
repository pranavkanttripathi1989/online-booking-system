---
id: PLAN150
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ110
related: [TP169, TR169]
---

# PLAN150 — Package transfer between patients

## Schema

New table, hand-written migration (this repo cannot run `prisma migrate
dev` non-interactively):

```prisma
model PackageTransferLog {
  id                 String   @id @default(uuid())
  patient_package_id String
  from_patient_id    String
  to_patient_id      String
  transferred_by_user_id String
  sittings_at_transfer Int
  client_org_id      String
  created_at         DateTime @default(now())

  patientPackage PatientPackages @relation(fields: [patient_package_id], references: [id])
  fromPatient    Patients        @relation("PackageTransferFrom", fields: [from_patient_id], references: [id])
  toPatient      Patients        @relation("PackageTransferTo", fields: [to_patient_id], references: [id])

  @@index([patient_package_id])
  @@index([client_org_id])
}
```

Add back-relations on `PatientPackages`/`Patients` (two named relations
on `Patients`, `PackageTransferFrom`/`PackageTransferTo`, since a patient
can appear as both source and destination across different transfers).
Migration file: `backend/prisma/migrations/<ts>_package_transfer_log/migration.sql`
— `CreateTable` + two `AddForeignKey` + two `CreateIndex`, no backfill
needed (new table, zero existing rows).

## Backend

**`backend/src/packages/dto/package.input.ts`** — new `TransferPackageInput`
(`patient_package_id: string`, `to_patient_id: string`).

**`backend/src/packages/packages.service.ts`**:

1. Fix `patientPackages(patientId, user)` — replace
   `...(user.client_org_id ? { client_org_id: user.client_org_id } : {})`
   with the `isPlatformOperator`/`isSameOrg`-based pattern already used
   correctly elsewhere in this codebase (e.g.
   `appointment-payments.service.ts#redeemPackageSitting`). Import
   `isPlatformOperator` from `common/scoping/tenant-scope`.

2. New `async transferPackage(input: TransferPackageInput, user: JwtPayload)`:
   - Load `patientPackage` by id; 404 if missing/deleted.
   - `isSameOrg(user, patientPackage.client_org_id)` — reject as "not
     found" (not "forbidden", matching this resolver's existing
     not-found-not-403 convention for cross-org reads elsewhere).
   - Reject if `expires_at < now()`.
   - Reject if `sittings_remaining < 1`.
   - Load `to_patient`; 404 if missing/deleted; reject if
     `to_patient.client_org_id`-derived org (via patient's own org
     linkage, `Patients.client_org_id` — added in this session's own
     recent `BUG024` fix) doesn't match `patientPackage.client_org_id`.
   - Reject if `to_patient_id === patientPackage.patient_id` (no-op
     transfer).
   - In one `$transaction`: update `PatientPackages.patient_id`, insert
     `PackageTransferLog` row with `sittings_at_transfer:
     patientPackage.sittings_remaining`.
   - Return `{success, userErrors, patientPackage}` — matches this
     resolver's existing `{success, userErrors, pkg}` convention shape.

**`backend/src/packages/packages.resolver.ts`** — new
`transferPackage(input: TransferPackageInput)` mutation, same `@Auth`
gate as `purchase`/`redeemPackageSitting` (manager/admin/staff — verify
exact roles against the existing gate on this resolver before writing).

**`backend/src/packages/entities/package.entity.ts`** — new
`PackageTransferLogType` (or inline on the mutation result) if the
frontend needs to render transfer history.

## Frontend

The current `frontend/src/pages/manager/packages/index.jsx` only manages
package *definitions* (the catalog) — it has no view of a specific
patient's *purchased* packages at all (`patientPackages` is queried only
from `appointments/detail.jsx`'s redeem-at-checkout flow). A "Transfer"
action needs a place to live where staff can see a patient's purchased
packages outside of an active appointment.

Recommend adding a new "Packages" section to `patients/detail.jsx` (the
existing per-patient detail page) — reuse the pattern already
established there for other patient-scoped sub-panels (e.g. the
Insurance tab added in the A-7 gap-analysis fix). New: `GET_PATIENT_PACKAGES`
query (already exists as `patientPackages(patient_id)` — reuse verbatim,
do not invent a second query), a list of purchased packages with
remaining sittings, and a "Transfer" icon button opening a dialog: pick
target patient (an `Autocomplete` against the existing patient-search
query, same pattern as `test-results/index.jsx`'s recent patient picker),
confirm, call `transferPackage`.

## Testing

`packages.service.spec.ts` new `transferPackage` describe block:
1. Happy path — sittings moved, log row created, returns updated
   `patientPackage`.
2. Rejects when `sittings_remaining === 0`.
3. Rejects an expired package.
4. Rejects cross-org target patient.
5. Rejects transferring to the same patient (no-op).
6. `patientPackages()` — a platform operator (`client_org_id: null`,
   `admin`/`super_admin`) still sees all; a non-platform caller with
   `client_org_id: null` (shouldn't happen operationally, but must fail
   closed per this codebase's own convention) sees nothing, not
   everything — this is the regression test for the ternary fix.

Live verification: real transfer between two seeded patients in the same
org via real GraphQL; confirm the original patient's `patientPackages()`
no longer includes it and the new patient's does; confirm a
`PackageTransferLog` row exists with the correct `sittings_at_transfer`.

e2e: extend `frontend/e2e/` with one new spec case — purchase a package,
transfer it, confirm the redeem-at-checkout flow on the target patient's
next appointment succeeds.

## Outcome (2026-08-26)

Implemented as planned, with one deliberate deviation: **no new e2e
Playwright spec** — no browser-automation tool was available this
session (the same honestly-logged gap as `REQ072`/`TR125`, not a
silently skipped step). Coverage instead comes from `packages.service.spec.ts`
(backend, mocked-Prisma, 7 new + 1 regression case) and
`patients/detail.test.jsx` (frontend, `MockedProvider`-backed, 4 new
cases against the real GraphQL contract shape) — see `TR169` for full
detail. `PackageTransferLogType` was not added to the GraphQL schema;
the frontend's transfer confirmation only needs `{success, userErrors}`
(reusing `PurchasePackageResultType` verbatim), and no page renders
transfer history yet, so the extra type would have been unused.
