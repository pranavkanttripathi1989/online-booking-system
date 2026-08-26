---
id: REQ138
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ131
related: [PLAN178, TP198, TR198]
---

# REQ138 — Reimbursement-pack PDF generation

## Why this slice

`REQ131`'s own "Deliberately out of scope" section named this exact
follow-on: *"Reimbursement-pack PDF generation — a natural follow-on
once claims exist to generate a pack *for*, not bundled into this
slice."* `REQ137` (this same batch, shipped immediately before this
slice) built the evidence linkage this pack needs — `grep -n
"reimbursement\|Reimbursement" backend/src frontend/src` had no hits
before starting.

## User story

As insurance-desk staff, I want to download one PDF containing a
claim's own tracking details and every prescription issued during its
appointment, so I have a single document to hand to a payer/TPA instead
of assembling one manually.

## Acceptance criteria

- **Given** an authorized (`staff`/`manager`/`admin`/`super_admin`)
  caller, **when** they request a claim's reimbursement pack, **then**
  a real PDF is returned with the claim's id, payer, patient, visit
  date, status, claim/approved amounts, and every prescription from
  `REQ137`'s own evidence query.
- **Given** a patient or clinician caller (a role the underlying
  `claims`/`claim` GraphQL queries already exclude), **when** they
  request the same REST endpoint, **then** it is rejected — closing a
  real gap found while building this: the REST download path bypasses
  GraphQL's own `@Auth` role gate entirely (see Implementation Note
  below).
- **Given** a claim with no evidence yet, **then** the pack still
  renders, with an honest "no prescriptions on file" line rather than
  an empty or broken section.
- **Given** a claims-desk user viewing the claim list, **then** they
  can trigger the download directly from that page, at any claim
  status — evidence can be real before a claim reaches a terminal
  status.

## In scope

- `GET /documents/claims/:id/reimbursement-pack/pdf` —
  `DocumentsService#reimbursementPackPdf`, composing
  `InsuranceService#claim()` and `#claimEvidencePrescriptions()`
  (`REQ137`), matching this module's established "compose existing
  scoped assembly methods" pattern (`REQ057`/`REQ129`'s own precedent).
- An explicit role re-check in the new service method (see
  Implementation Note).
- A "Pack" download button on every row of `manager/claims/index.jsx`
  (`REQ131`'s claims desk), using the same authenticated-download
  helper (`downloadAuthenticatedPdf`) every other PDF download in this
  codebase already uses.

## Implementation note — a real access-control gap found while building this

`InsuranceService`'s claim-loading helper (`loadClaimForUser`, reused by
both `claim()` and the new `claimEvidencePrescriptions()`) only checks
org membership, never role — the `claims`/`claim` GraphQL queries'
exclusion of `patient`/`clinician` callers is enforced entirely by
`InsuranceResolver`'s own `@Auth` decorator. `DocumentsController` is a
plain REST controller that authenticates a bearer token itself but never
passes through `GqlAuthGuard`/`RolesGuard` (this module's own existing
doc comment already says as much, for a different reason — it never
previously mattered for prescriptions/invoices/visit-summaries because
those domains' own self-scoping already restricts a patient/clinician to
their own records; claims has no equivalent "your own" concept for those
roles at all). Left as originally planned, this endpoint would have let
any same-org patient or clinician JWT download another patient's
insurance-claim reimbursement pack. Fixed by re-asserting the same role
gate explicitly inside `reimbursementPackPdf` itself.

## Deliberately out of scope

- Any change to `prescriptionPdf`/`invoicePdf`/`visitSummaryPdf`'s own
  access control — each has a real self-scoping reason the same gap
  doesn't apply to them, confirmed by re-reading each before deciding
  not to touch them.
- A dedicated claim-detail page — `manager/claims/index.jsx` is a flat
  list with inline row actions; the download button lives there, not on
  a new detail view that doesn't exist yet.
