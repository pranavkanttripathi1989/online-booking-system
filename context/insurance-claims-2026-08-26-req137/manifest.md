---
id: CTX-insurance-claims-2026-08-26-req137
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ137
related: [PLAN177, TP197, TR197]
---

# insurance-claims — REQ137: auto-attach a claim's issued prescriptions as evidence (2026-08-26)

Fourth slice of the next 10-slice batch (`project-plans/analysis/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ137 | [Auto-attach prescription evidence](../../requirements/insurance-claims/improvement/REQ137-insurance-claims-2026-08-26-auto-attach-prescription-evidence.md) |
| implementation-plans | PLAN177 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN177-insurance-claims-2026-08-26-auto-attach-prescription-evidence.md) |
| test-plans | TP197 | [verification plan](../../test-plans/insurance-claims/improvement/TP197-insurance-claims-2026-08-26-auto-attach-prescription-evidence.md) |
| test-results | TR197 | [verification results — pass](../../test-results/insurance-claims/improvement/TR197-insurance-claims-2026-08-26-auto-attach-prescription-evidence.md) |

## What shipped

`REQ131`'s own doc named "auto-attaching a signed prescription... as
claim evidence (US-INS-06)" as deliberately out of scope. This slice
closes it: `claimEvidencePrescriptions(claim_id)`, a read-only query
joining `Claims.appointment_id` → `Encounters` (1:1) →
`Prescriptions` (1:many), reusing `loadClaimForUser`'s existing access
control and a new `PrescriptionsService#prescriptionsForEncounter()`
(reusing the existing private `itemsToGraphQL` drug-name mapping) — no
new attachment-storage subsystem, no schema change.

Scope investigation before starting: on this domain, `createPrescription`
itself is the sign-off act (`REQ129`'s own doc — "issuing a script is a
clinical act") — there's no separate "signed" sub-state to filter for,
so every prescription tied to the claim's appointment/encounter already
qualifies as evidence.

## Verification

Backend: 92/92 unit suites, 1544/1544 tests (5 new); integration 4/4
suites, 387/387 unchanged (no schema change; `insurance` domain already
tenancy-matrix-classified). `tsc --noEmit`/`eslint` clean. No frontend
change this slice — a consuming UI is a named, deliberate follow-on.
