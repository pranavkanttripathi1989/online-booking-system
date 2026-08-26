---
id: CTX-insurance-claims-2026-08-26-req138
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ138
related: [PLAN178, TP198, TR198]
---

# insurance-claims — REQ138: reimbursement-pack PDF generation (2026-08-26)

Fifth slice of the next 10-slice batch (`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ138 | [Reimbursement-pack PDF generation](../../requirements/insurance-claims/improvement/REQ138-insurance-claims-2026-08-26-reimbursement-pack-pdf.md) |
| implementation-plans | PLAN178 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN178-insurance-claims-2026-08-26-reimbursement-pack-pdf.md) |
| test-plans | TP198 | [verification plan](../../test-plans/insurance-claims/improvement/TP198-insurance-claims-2026-08-26-reimbursement-pack-pdf.md) |
| test-results | TR198 | [verification results — pass](../../test-results/insurance-claims/improvement/TR198-insurance-claims-2026-08-26-reimbursement-pack-pdf.md) |

## What shipped

`REQ131`'s own doc named a reimbursement-pack PDF as a natural
follow-on once claims exist to generate one for; `REQ137` (this same
batch) built the evidence linkage it needed. `GET /documents/claims/:id
/reimbursement-pack/pdf` composes `InsuranceService`'s own `claim()`
and `claimEvidencePrescriptions()` — claim tracking details plus every
issued prescription, one PDF. A "Pack" download button on
`manager/claims/index.jsx`'s claim rows closes the discoverability gap.

**A real access-control gap found while building this**: the REST
`DocumentsController` never passes through `GqlAuthGuard`/`RolesGuard`,
and `InsuranceService`'s own `loadClaimForUser` only checks org
membership — the `claims`/`claim` GraphQL queries' exclusion of
`patient`/`clinician` callers exists solely on `InsuranceResolver`'s
`@Auth` decorator. Left unaddressed, any same-org patient/clinician JWT
could have downloaded another patient's claim reimbursement pack
through this new REST route. Closed with an explicit role re-check
inside `reimbursementPackPdf` itself.

## Verification

Backend: 92/92 unit suites, 1549/1549 tests (5 new); integration 4/4
suites, 387/387 unchanged (confirms the new module wiring boots
cleanly, no circular dependency). `tsc --noEmit`/`eslint` clean.
Frontend: `manager/claims/index.test.jsx` 5/5 (1 new), lint ratchet held
at 1909, build succeeds.
