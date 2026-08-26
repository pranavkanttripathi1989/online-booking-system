---
id: PLAN179
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ139
related: [TP199, TR199]
---

# PLAN179 — Implementation plan: org logo propagated into PDF letterheads

## Change

**`backend/src/common/pdf/render-pdf.ts`**: new private
`resolveLogoPath(logoUrl?)` — `org-branding.controller.ts` always stores
`logo_url` as a same-origin relative path (`/uploads/branding/<file>`),
never a full URL, so this is a local filesystem lookup (`fs.existsSync`
against `UPLOADS_ROOT` — three directories up from `src/common/pdf/`,
matching `org-branding.controller.ts`'s own `UPLOAD_DIR` computation
and `main.ts`'s own `useStaticAssets()` root), not a network fetch. A
path outside `/uploads/` or one that doesn't resolve returns
`undefined`. `drawLetterhead()` gains a fourth optional `logoUrl?`
parameter — when it resolves, `doc.image(path, {fit: [64, 64]})` renders
above the clinic name (wrapped in try/catch: a file that passes
`existsSync` but isn't a pdfkit-decodable image falls through to
text-only rather than throwing).

**`backend/src/documents/documents.service.ts`**: all three in-scope
`drawLetterhead(...)` calls (`drawPrescriptionPdf`, `invoicePdf`,
`visitSummaryPdf`) now pass their already-available `logo_url` as the
fourth argument. `reimbursementPackPdf` (`REQ138`) is unchanged — see
the requirement doc's own "Deliberately out of scope" for why.

**`backend/src/appointment-payments/appointment-payments.service.ts`**:
`invoiceForDownload`'s returned `clinic` object gains `logo_url:
payment.clinic.client_organization?.logo_url ?? undefined` — the
`client_organization` row is already fetched via the existing `include`,
just not read out before this slice.

## Testing

`backend/src/common/pdf/render-pdf.spec.ts` (new): 6 cases —
`renderPdfToBuffer` produces real PDF bytes and propagates a build-time
throw; `drawLetterhead` renders text-only with no `logoUrl`; falls back
gracefully when `logoUrl` doesn't resolve to a real file; ignores a
`logoUrl` outside `/uploads/`; and — with a real 1×1 PNG written to
`backend/uploads/branding/` (the same on-disk convention
`org-branding.controller.ts` itself uses) and removed in `afterAll` —
embeds the real image without throwing. This is the first spec file for
`render-pdf.ts`.

`backend/src/documents/documents.service.spec.ts`: 3 new cases (one per
in-scope call site) confirming a real PDF still renders when
`clinic.logo_url`/`org.logo_url` is set.

`backend/src/appointment-payments/appointment-payments.service.spec.ts`:
existing `invoiceForDownload` fixture/assertion updated to include
`logo_url` (a strict `toEqual` on the `clinic` shape would otherwise
break on the new field); 1 new case confirming a graceful `undefined`
fallback when the org has never uploaded a logo.

Full backend unit suite: 93/93 suites (1 new), 1559/1559 tests (10
new). Integration suite: 4/4 suites, 387/387 unchanged — no schema
change. `tsc --noEmit`/`eslint` clean.

## Documentation

`REQ139` (this requirement), `PLAN179` (this plan), `TP199`/`TR199`
(verification), a context bundle, and index updates across all five doc
roots plus the `organization-branding` feature README.
