---
id: TP199
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN179
related: []
---

# TP199 — Test plan: org logo propagated into PDF letterheads

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Baseline unchanged | `drawLetterhead` with no `logoUrl` | Real PDF, text-only, same as before this slice |
| 2 | Graceful fallback — missing file | `logoUrl` pointing to a nonexistent path | Real PDF, no throw, text-only |
| 3 | Rejects non-`/uploads/` paths | `logoUrl` = an external URL | Real PDF, no throw, text-only (never attempts a network fetch) |
| 4 | Real image embeds | A real PNG written to `backend/uploads/branding/`, referenced by `logoUrl` | Real PDF, no throw |
| 5 | `prescriptionPdf` still renders with a logo | `clinic.logo_url` set on assembled data | Real PDF |
| 6 | `invoicePdf` still renders with a logo | `clinic.logo_url` set on assembled data | Real PDF |
| 7 | `visitSummaryPdf` still renders with a logo | `org.logo_url` set | Real PDF |
| 8 | `invoiceForDownload` passes `logo_url` through | Real `client_organization.logo_url` on the fixture | Returned `clinic.logo_url` matches |
| 9 | `invoiceForDownload` graceful fallback | No `logo_url` on `client_organization` | Returned `clinic.logo_url` is `undefined` |
| 10 | Full suite regression | Backend unit + integration | 93/93 suites (1 new) / 1559/1559 tests; integration 4/4 / 387/387 unchanged |
| 11 | Lint/typecheck clean | All touched files | 0 errors |
