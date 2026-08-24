---
id: TP107
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN080
related: [REQ057]
---

# TP107 — Test plan: downloadable PDFs for prescriptions, invoices, and visit summaries

Skipping the test-suggestion stage per CLAUDE.md's conditional rule — this
composes three already-proven (two pre-existing, one new-but-narrow)
assembly methods behind a REST-controller shape this codebase already
uses twice (`AttachmentsController`/`OrgBrandingController`). Going
straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `invoiceForDownload()` — nonexistent payment | `null` |
| 2 | `invoiceForDownload()` — cross-org payment | `null`, never confirms cross-tenant existence |
| 3 | `invoiceForDownload()` — a patient caller requesting a different patient's invoice | `null` |
| 4 | `invoiceForDownload()` — a payment that never succeeded | `null` (no real invoice exists) |
| 5 | `invoiceForDownload()` — happy path | Full GST invoice shape, paise converted to rupees |
| 6 | `invoiceForDownload()` — the owning patient | Allowed |
| 7 | `prescriptionPdf()` — `printPrescription()` throws | Propagated, not swallowed |
| 8 | `prescriptionPdf()` — happy path | Real PDF Buffer (`%PDF` magic bytes) |
| 9 | `prescriptionPdf()` — `is_reprint: true` | Renders the DUPLICATE watermark without throwing |
| 10 | `invoicePdf()` — underlying service returns `null` | `NotFoundException` |
| 11 | `invoicePdf()` — happy path | Real PDF Buffer, GST fields rendered |
| 12 | `visitSummaryPdf()` — `encounter()` throws | Propagated, not swallowed |
| 13 | `visitSummaryPdf()` — happy path | Real PDF Buffer; patient/clinician/clinic names joined outside the raw encounter row |
| 14 | `visitSummaryPdf()` — a genuinely orphaned appointment (all three name lookups null) | Still renders without throwing |

## Out of scope

Pixel-perfect visual parity, dependant-aware self-scoping, frontend
download UI (backend-only per this batch's confirmed direction), PWA/
offline shell, ABHA linking.
