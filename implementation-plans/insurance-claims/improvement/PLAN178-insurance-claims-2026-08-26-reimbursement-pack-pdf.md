---
id: PLAN178
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ138
related: [TP198, TR198]
---

# PLAN178 — Implementation plan: reimbursement-pack PDF generation

## Change

**`backend/src/documents/documents.service.ts`**: constructor now also
injects `InsuranceService`. New `reimbursementPackPdf(claimId, user)`:

1. Explicit role check (`staff`/`manager`/`admin`/`super_admin`) before
   anything else — see the requirement doc's own Implementation Note on
   why this can't be left to `InsuranceService` alone.
2. `Promise.all([insuranceService.claim(claimId, user),
   insuranceService.claimEvidencePrescriptions(claimId, user)])` — both
   reuse `loadClaimForUser`'s own org-scoping, so a cross-org id throws
   `NotFoundException` before any PDF work starts.
3. A direct `prisma.appointments.findUnique({include: {clinic:
   true}})` for the clinic name/phone shown on the letterhead — the same
   "fetch supplementary display data directly, outside the composed
   service methods" pattern `visitSummaryPdf` already established for
   patient/clinician/org names.
4. Renders via the existing `renderPdfToBuffer`/`drawLetterhead`
   helpers: claim header (id, payer, patient, visit date, status,
   amounts, rejection reason/notes if present), then a "Supporting
   Prescriptions" section iterating the evidence list, or an honest "no
   prescriptions on file" line when empty.

**`backend/src/documents/documents.module.ts`**: imports
`InsuranceModule` (already exports `InsuranceService`). No circular
dependency — confirmed via a full `npm run test:int` run (boots the real
`AppModule`), 4/4 suites green.

**`backend/src/documents/documents.controller.ts`**: new `GET
/documents/claims/:id/reimbursement-pack/pdf`, same
`authenticate()`/`sendPdf()` shape as the other three document routes.

**`frontend/src/pages/manager/claims/index.jsx`**: imports
`downloadAuthenticatedPdf` (the same helper `PrescriptionPrint.jsx`/
`EncounterWorkspace.jsx`/`appointments/detail.jsx` already use for their
own authenticated PDF downloads — a plain `<a href>` can't carry a
Bearer header). New `downloadingId` state (per-row loading, not a
single page-wide flag, since multiple claims can each have their own
pack downloaded independently) and `handleDownloadPack(claim)`. A
"Pack" outlined `Button` added to every row's existing action `Stack`,
available regardless of status.

## Testing

`backend/src/documents/documents.service.spec.ts`: 5 new cases —
rejects a patient/clinician caller before ever calling
`InsuranceService` (the access-control fix itself); propagates
`claim()`'s own cross-org `NotFoundException`; renders a real PDF for
an authorized staff caller with real claim + evidence data; still
renders with an honest empty-evidence note; still renders when the
clinic lookup resolves to `null`.

`frontend/src/pages/manager/claims/index.test.jsx`: 1 new case —
clicking "Pack" calls the real `downloadAuthenticatedPdf` with the
correct path/filename. `downloadAuthenticatedPdf` is mocked at the
module boundary (it does a real `fetch()`, not a GraphQL operation
`MockedProvider` can intercept) — the first such test in this codebase
for this download pattern; no existing page asserted on it before.

Full backend unit suite: 92/92 suites, 1549/1549 tests (5 new).
Integration suite: 4/4 suites, 387/387 unchanged — no schema change, app
boots cleanly with the new module wiring. `tsc --noEmit`/`eslint` clean.
Frontend: `manager/claims/index.test.jsx` 5/5 (1 new), `eslint` clean,
full `npm run lint` ratchet held at 1909, `npm run build` succeeds.

## Documentation

`REQ138` (this requirement, includes the access-control finding),
`PLAN178` (this plan), `TP198`/`TR198` (verification), a context bundle,
and index updates across all five doc roots plus the `insurance-claims`
feature README.
