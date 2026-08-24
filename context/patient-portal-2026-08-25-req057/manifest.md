---
id: CTX-patient-portal-2026-08-25-req057
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ057
related: [REQ027, REQ021, REQ023, REQ020, PLAN080, TP107, TR106]
---

# patient-portal — REQ057: downloadable PDFs for prescriptions, invoices, and visit summaries (2026-08-25)

Seventh slice in the 8-slice batch picked from `project-plans/` this
session (research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account). First-ever `improvement`/`PLAN`/`TP`/`TR` documents for the
`patient-portal` feature slug — all three non-requirement feature READMEs
were created fresh this slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ057 | [downloadable record PDFs](../../requirements/patient-portal/improvement/REQ057-patient-portal-2026-08-25-downloadable-record-pdfs.md) |
| implementation-plans | PLAN080 | [implementation plan](../../implementation-plans/patient-portal/improvement/PLAN080-patient-portal-2026-08-25-downloadable-record-pdfs.md) |
| test-plans | TP107 | [verification plan](../../test-plans/patient-portal/improvement/TP107-patient-portal-2026-08-25-downloadable-record-pdfs.md) |
| test-results | TR106 | [verification results — pass, 80/80 suites](../../test-results/patient-portal/improvement/TR106-patient-portal-2026-08-25-downloadable-record-pdfs.md) |

## What shipped

Real server-side PDF generation via a new `pdfkit` dependency (not
puppeteer — this session's own observed host disk/memory pressure), a new
`backend/src/documents/` module exposing 3 REST routes (a binary PDF
response can't be a GraphQL query). Zero new tenant-isolation logic:
prescriptions and visit summaries reuse two already-existing, already
org/self-scoped assembly methods (`printPrescription()`, `encounter()`)
verbatim; only invoices needed a genuinely new read-side assembler
(`invoiceForDownload()`), since no prior method assembled a full GST
invoice shape.

## A real bug found and fixed

`import PDFDocument from 'pdfkit'` type-checked but threw
`pdfkit_1.default is not a constructor` at runtime — this project's
`tsconfig.json` has `allowSyntheticDefaultImports` (type-check only) but
not `esModuleInterop` (the flag that actually generates the `.default`
wrapper at runtime for a CJS module). Fixed with TypeScript's `import X =
require(...)` form. Caught by the first real unit test run, not
`tsc --noEmit` — worth remembering for any future default-imported
CJS-only dependency in this codebase.

## Scope decisions, documented not silently dropped

Pixel-perfect visual parity with `PrescriptionPrint.jsx` was not
attempted (real, structured, data-driven content instead); dependant-aware
self-scoping was deliberately NOT added to any of the three reused checks,
per `CLAUDE.md`'s own standing note that widening it is separate,
reviewed, security-sensitive work per domain; frontend download UI is
backend-only per this batch's confirmed direction.

## Verification

Backend unit: 80/80 suites, 1198/1198 tests (was 79/1184). `eslint`/
`tsc --noEmit` clean. No integration-suite change — the new module is a
plain REST controller, structurally invisible to
`matrix-coverage.int-spec.ts`'s `.resolver.ts`-file scan, matching
`AttachmentsController`/`OrgBrandingController`'s own precedent. Container
restarted and confirmed a clean compile (slow under host load, confirmed
active via `docker stats` rather than wedged).
