---
id: CTX-organization-branding-2026-08-26-req139
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ139
related: [PLAN179, TP199, TR199]
---

# organization-branding — REQ139: org logo propagated into PDF letterheads (2026-08-26)

Sixth slice of the next 10-slice batch (`project-plans/analysis/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ139 | [PDF letterhead logo](../../requirements/organization-branding/improvement/REQ139-organization-branding-2026-08-26-pdf-letterhead-logo.md) |
| implementation-plans | PLAN179 | [implementation plan](../../implementation-plans/organization-branding/improvement/PLAN179-organization-branding-2026-08-26-pdf-letterhead-logo.md) |
| test-plans | TP199 | [verification plan](../../test-plans/organization-branding/improvement/TP199-organization-branding-2026-08-26-pdf-letterhead-logo.md) |
| test-results | TR199 | [verification results — pass](../../test-results/organization-branding/improvement/TR199-organization-branding-2026-08-26-pdf-letterhead-logo.md) |

## What shipped

`REQ002`'s own doc deferred invoice/document logo propagation since no
documents module existed yet; `REQ057` later built one, but
`drawLetterhead()` never read the `logo_url` every assembly method
already fetched. `drawLetterhead()` now accepts an optional `logoUrl`,
resolves it to a real file under `backend/uploads/branding/` (the same
path `org-branding.controller.ts` writes to), and embeds it above the
clinic name — falling back to text-only, never a broken document, when
no logo exists or the file can't be read. Wired into
`prescriptionPdf`/`prescriptionPdfForShare`, `invoicePdf` (which also
needed `logo_url` added to `invoiceForDownload`'s own return shape),
and `visitSummaryPdf`. `reimbursementPackPdf` (`REQ138`) is a named,
deliberate exclusion — its clinic lookup doesn't join
`ClientOrganizations`.

## Verification

Backend: 93/93 unit suites (1 new — `render-pdf.spec.ts`, this file's
first), 1559/1559 tests (10 new); integration 4/4 suites, 387/387
unchanged. `tsc --noEmit`/`eslint` clean. The real-image-embedding test
writes and cleans up a genuine file on the real upload path, confirmed
residue-free afterward.
