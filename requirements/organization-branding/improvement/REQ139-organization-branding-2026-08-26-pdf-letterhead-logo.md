---
id: REQ139
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ002
related: [PLAN179, TP199, TR199]
---

# REQ139 — Org logo propagated into PDF letterheads

## Why this slice

`REQ002`'s own doc explicitly deferred this: *"booking-email/invoice/
favicon propagation and plan-tier gating remain out of scope, logged
there rather than silently dropped, since no email pipeline/invoice
module/entitlements guard exists yet."* The `documents` module
(`REQ057`) has since been built — every PDF-generating assembly method
already fetches `org.logo_url` into its own data (confirmed: `grep -n
"logo_url" backend/src/prescriptions/prescriptions.service.ts` shows it
present in `assemblePrintPayload`'s output), but `drawLetterhead()` in
`common/pdf/render-pdf.ts` took no logo parameter at all — confirmed by
reading it before starting.

## User story

As an org admin who has uploaded a branding logo (`REQ002`), I want
that logo to appear on the prescriptions, invoices, and visit summaries
my clinic generates, so patient-facing documents carry the same
branding as the rest of the app.

## Acceptance criteria

- **Given** an org with a real uploaded logo, **when** a prescription/
  invoice/visit-summary PDF is generated for that org, **then** the
  logo renders at the top of the letterhead, above the clinic name.
- **Given** an org with no logo uploaded, **then** the letterhead
  renders exactly as before — clinic name and phone, text only.
- **Given** a `logo_url` that no longer resolves to a real file on disk
  (a stale/corrupted reference), **then** the document still renders
  successfully with a text-only letterhead, never a broken or failed
  generation.

## In scope

- `drawLetterhead(doc, clinicName, contactPhone, logoUrl?)` — resolves
  the stored `/uploads/branding/<file>` path to a real filesystem path
  and embeds it via pdfkit's `doc.image()`, with a try/catch fallback to
  text-only.
- Wired into `prescriptionPdf`/`prescriptionPdfForShare` (via the
  already-shared `drawPrescriptionPdf`), `invoicePdf`, and
  `visitSummaryPdf` — the three call sites `REQ057` originally built.
- `AppointmentPaymentsService#invoiceForDownload` now also returns
  `clinic.logo_url` (it fetches `client_organization` already; the
  field just wasn't read out).

## Deliberately out of scope

- `reimbursementPackPdf` (`REQ138`, shipped earlier in this same batch)
  — its own clinic lookup joins `Appointments.clinic` (`Clinics`
  table), not `ClientOrganizations`, and `Clinics` has no `logo_url`
  column of its own. Adding the extra join is a real, separate,
  small follow-on, not bundled into this slice's own three named call
  sites.
- Booking-confirmation emails and a favicon — `REQ002`'s own original
  deferral note; no email-template rendering pipeline or favicon
  concept exists in this codebase to propagate into, unchanged by this
  slice.
- Resizing/optimizing the uploaded logo for print — `doc.image()`'s own
  `fit: [64, 64]` scales the display size only; the stored file's own
  resolution/format is whatever `org-branding.controller.ts` accepted
  at upload time (PNG/JPEG, max 2MB).
