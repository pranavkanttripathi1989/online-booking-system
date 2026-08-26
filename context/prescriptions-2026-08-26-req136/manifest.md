---
id: CTX-prescriptions-2026-08-26-req136
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ136
related: [PLAN176, TP196, TR196]
---

# prescriptions — REQ136: a real frontend surface for prescription-integrity verification (2026-08-26)

Third slice of the next 10-slice batch (`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ136 | [Verify a Prescription UI](../../requirements/prescriptions/improvement/REQ136-prescriptions-2026-08-26-verify-prescription-ui.md) |
| implementation-plans | PLAN176 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN176-prescriptions-2026-08-26-verify-prescription-ui.md) |
| test-plans | TP196 | [verification plan](../../test-plans/prescriptions/improvement/TP196-prescriptions-2026-08-26-verify-prescription-ui.md) |
| test-results | TR196 | [verification results — pass](../../test-results/prescriptions/improvement/TR196-prescriptions-2026-08-26-verify-prescription-ui.md) |

## What shipped

`REQ129` built and tested `verifyPrescriptionIntegrity` end to end on
the backend, then explicitly deferred "any frontend surface calling
[it] directly." This slice closes that gap: a standalone
`/prescriptions/verify` page (any authenticated role, no `RoleGuard` —
matching the query's own broad `@Auth` gate), pre-fillable via `?id=`,
showing a real valid/invalid result plus the same human-checkable
verification code format `PrescriptionPrint.jsx`/`documents.service.ts`
already print — and an honest "no verification code on file" state for
a legacy prescription issued before `REQ129`. A `Verify` button added to
`PrescriptionPrint.jsx`'s existing screen-only toolbar closes the
discoverability gap: the real target use case (a pharmacist or patient
holding a printed copy) had no way to find the standalone route
otherwise.

No backend change — purely a consumption surface for an already-correct,
already-tested contract.

## Verification

Frontend: `Verify.test.jsx` 5/5 (new), `PrescriptionPrint.test.jsx` 6/6
(unaffected by the new button). `eslint` clean on all touched/new files
(2 pre-existing, unrelated warnings on `PrescriptionPrint.jsx`
unchanged). Full `npm run lint` ratchet held at 1909. `npm run build`
succeeds. No backend changes; backend suites unaffected.
