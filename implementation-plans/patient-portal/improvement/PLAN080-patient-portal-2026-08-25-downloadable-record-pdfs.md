---
id: PLAN080
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ057
related: [REQ027, REQ021, REQ023, REQ020]
---

# PLAN080 — Implementation plan: downloadable PDFs for prescriptions, invoices, and visit summaries

## Scope

`REQ057` (`US-PAT-02`, `REQ027` P0) — real server-side PDF generation for
three record types, reusing each domain's own existing (or newly added,
for invoices) org/self-scoped assembly method rather than re-deriving
access control.

## Research findings that shaped the design

`PrescriptionsService.printPrescription()` already assembles exactly the
shape `PrescriptionPrint.jsx` renders (letterhead, clinician, patient,
items, `is_reprint`) — reused directly, no new prescription-assembly code
written. `EncountersService.encounter()` likewise already returns
everything a visit summary needs (encounter + notes + diagnoses +
attachments) — also reused directly. Only invoices had no existing
read-side assembler (`invoiceDetailsForSuccess()` is a write-time-only
helper), so `AppointmentPaymentsService.invoiceForDownload()` is
genuinely new. No file-download precedent existed anywhere in this
codebase (`AttachmentsController`/`OrgBrandingController` are both
upload-only) — the REST-controller-with-manual-bearer-verification shape
is copied from those two, but the binary-response part (`Content-Type:
application/pdf`, `Content-Disposition: attachment`) is new.

## Design

`backend/src/common/pdf/render-pdf.ts` — one shared `renderPdfToBuffer()`
wrapping pdfkit's stream API in a Promise, plus a `drawLetterhead()`
helper reused by all three document types. `backend/src/documents/`:
`DocumentsService` (composes the three underlying assemblers + pdfkit
rendering), `DocumentsController` (3 REST routes, manual
`JwtService.verifyAsync` auth matching `OrgBrandingController`'s own
pattern exactly), `DocumentsModule` (imports `PrescriptionsModule`,
`AppointmentPaymentsModule`, `EncountersModule`, `AuthModule` — each of
the first three needed a new `exports: [...]` line added, since none
previously exported its service for cross-module injection).

`invoiceForDownload()` lives in `appointment-payments.service.ts` itself
(not in the new `documents` module) — it's an `AppointmentPayments`-domain
read, matching Hard Rule 7's "don't invent a parallel lookup" reasoning
the same way `REQ055`'s branch-override pricing did. Only a `status:
'succeeded'` payment has a real invoice, matching this table's own
existing `invoice_number`-is-always-real-once-succeeded convention.

`DocumentsController` needs no new tenancy-matrix row — confirmed by
reading `matrix-coverage.int-spec.ts`'s own `resolverDomains()`, which
only scans for `*.resolver.ts` files; a plain `@Controller` (no
`.resolver.ts`) is structurally invisible to that scan, the same way
`AttachmentsController`/`OrgBrandingController` already are. Cross-tenant
isolation is entirely delegated to the three reused/added service
methods, each already unit-tested for exactly that.

## A real bug found and fixed before commit

`import PDFDocument from 'pdfkit'` type-checked cleanly (this project's
`tsconfig.json` has `allowSyntheticDefaultImports: true`) but threw
`TypeError: pdfkit_1.default is not a constructor` at runtime under
`ts-jest`'s CommonJS output — `allowSyntheticDefaultImports` is a
type-checking-only convenience; the actual ES-module-interop wrapper that
would populate `.default` on a CJS module's export requires
`esModuleInterop`, which this `tsconfig.json` does not set. `pdfkit`'s own
CJS export has no `.default` property, so the compiled `pdfkit_1.default`
reference was `undefined`. Fixed with TypeScript's `import PDFDocument =
require('pdfkit')` form, which always binds directly to `module.exports`
regardless of either interop flag — caught by the first real unit test
run, not by `tsc --noEmit` (which has no runtime component to catch an
interop mismatch like this).

## Testing

`appointment-payments.service.spec.ts` — 6 new cases for
`invoiceForDownload` (nonexistent, cross-org, cross-patient, not-succeeded,
happy-path paise-to-rupees conversion, the owning patient's own access
allowed).

`documents.service.spec.ts` (new, 8 cases): each of the three PDF methods
gets an access-control-failure-propagation case (the underlying service's
own throw/null is never swallowed) and a real-render case, asserted by
the rendered `Buffer`'s own magic bytes (`%PDF`) — a genuine, if coarse,
proof the renderer produced real PDF output from the fixture data, not a
fabricated Buffer. `prescriptionPdf` additionally covers the
`is_reprint`/DUPLICATE-watermark branch; `visitSummaryPdf` covers a
genuinely orphaned appointment (all three name lookups resolve null)
rendering without throwing.

Full suite: backend unit — 80/80 suites, 1198/1198 tests (was 79/1184
after `REQ056`). `eslint`/`tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped)

See `REQ057`'s own doc — pixel-perfect visual parity, dependant-aware
self-scoping, frontend download UI, PWA/offline, ABHA linking.
