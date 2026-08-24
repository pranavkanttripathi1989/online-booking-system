---
id: REQ057
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: REQ027
related: [REQ027, REQ021, REQ023, REQ020]
---

# Downloadable PDFs for prescriptions, invoices, and visit summaries

## Source

`REQ027`'s own P0 story (`US-PAT-02`) — the first slice of the patient
portal's "records" scope. PWA shell/offline, ABHA linking, and family-
profile UI (the profile *data model* already shipped via `REQ018`) are
correctly out of scope here — each is its own future slice.

## User story

**US-PAT-02** — As a patient, I want to download my prescriptions,
invoices, and visit summaries as PDFs, so that I have my own compliant
copies without asking the front desk.

- Acceptance criteria (from `REQ027`'s own doc): every record type is
  downloadable in a format matching its print template (`REQ021`'s Rx
  layout, `REQ023`'s GST invoice layout) — not a plain-text summary that
  loses the compliant formatting.

## Architectural decision — real server-side PDF generation

`project-plans/technical-plans/01-phase1-mvp.md` warns explicitly that
matching a print template exactly "effectively requires server-side PDF
generation... retrofitting this after a browser-print MVP means
rebuilding the feature" — and `REQ021`'s already-shipped
`PrescriptionPrint.jsx` *is* that browser-print MVP (`window.print()`, no
server-side rendering at all). This slice does not try to reuse that
rendering path; it builds real PDF generation from scratch, in the
backend, from the same underlying data each domain's own resolver already
returns.

`pdfkit` (pure JS, no bundled/downloaded browser) was added as a new
backend dependency rather than `puppeteer` — this session directly
observed host disk/memory pressure earlier, and a Chromium
download-per-install plus a headless-browser-per-request pattern would be
a real, avoidable cost here that pdfkit's pure-JS rendering doesn't carry.

## Design

New `backend/src/documents/` module: a plain REST controller (`GET
/documents/{prescriptions,invoices,visit-summaries}/:id/pdf`), not a
GraphQL resolver — a PDF is a binary response
(`Content-Type: application/pdf`), which GraphQL cannot express, matching
this codebase's own existing REST-alongside-GraphQL precedent
(`AttachmentsController`, `OrgBrandingController`) for exactly this
reason. Auth is a manually-verified bearer token (`JwtService.verifyAsync`),
the same pattern those two controllers already use, since the global
`GqlAuthGuard` only protects the GraphQL execution context.

**Zero new tenant-isolation logic was written.** `DocumentsService`
composes three already-existing, already-tested assembly methods rather
than re-deriving access control a third time:
- Prescriptions: `PrescriptionsService.printPrescription()` (already
  built for `REQ021`'s print view) — reused verbatim, including its
  existing `reprint_count`/`is_reprint` side effect (a PDF download counts
  as a "print" the same way the browser print view already does; not a
  new exception).
- Invoices: a genuinely new read-side assembler,
  `AppointmentPaymentsService.invoiceForDownload()` — no prior method
  assembled a full GST invoice shape (the existing
  `invoiceDetailsForSuccess()` only computes GST fields at payment-success
  write time). Placed in `appointment-payments.service.ts` itself, next to
  the domain it belongs to, not in the new `documents` module.
- Visit summaries: `EncountersService.encounter()` (already built for
  `REQ020`'s consultation workspace) — already returns exactly the shape
  needed (encounter + notes + diagnoses + attachments); `DocumentsService`
  only adds the patient/clinician/clinic name lookups a printable document
  needs that the raw encounter row doesn't carry.

Each of the three underlying methods throws/returns null on any
cross-org, cross-patient, or cross-clinician access on its own — the new
controller and service layer never re-implement that check, and never
would even see the request succeed past that point for an unauthorized
caller.

**Self-scoping stays exactly as conservative as the rest of the
codebase.** `CLAUDE.md`'s own tracked residue item notes that
`prescriptions`/`test-results`/`messages` still restrict a `'patient'`
caller to exactly their own `patient_id`, not a linked dependant's
(`REQ018`'s family-profiles feature) — described there as "real, separate,
security-sensitive follow-on work per domain, not a single mechanical
find-and-replace." This slice does not widen any of the three self-scope
checks it reuses, deliberately: doing so as a side effect of a PDF-download
feature would be exactly the "mechanical find-and-replace" that note warns
against, not a reviewed decision.

## Out of scope (deferred, not silently dropped)

Pixel-perfect visual parity with `PrescriptionPrint.jsx`'s CSS layout (the
PDF is real, structured, and data-driven — letterhead, patient/clinician
info, drug table, signature line, DUPLICATE watermark for a reprint — but
exact spacing/typography was not iterated to match); dependant-aware
self-scoping for any of the three document types (see above — a separate,
reviewed slice per `CLAUDE.md`'s own note); a frontend download UI
(backend-only, per this batch's confirmed direction — the REST endpoint
needs an `Authorization` header a plain `<a href>` can't send, so the
eventual frontend pass will need a `fetch()` + Blob-URL pattern, not a
bare link); PWA/offline shell, ABHA linking (both separate `REQ027`
stories).
