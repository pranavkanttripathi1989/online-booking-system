---
feature: patient-payments
date: 2026-08-22
ids: [REQ023]
status: in-progress
---

# patient-payments — 2026-08-22

Derived from the CareOS PRD's M10 (Billing, Invoicing & Patient Payments), extending the real Razorpay integration already shipped under `REQ004`. Real gaps: no mixed-tender/split-tender counter billing, no day-end cash close, no doctor revenue-share, and no corporate/TPA credit billing. Also inherits two prior findings as this requirement's own P0 scope rather than deferring them: `project-plans` F-07 (`createRazorpayOrder` is anonymous, no ownership check) and F-17 (GST fields exist on SaaS billing but not on patient payments, blocking statutory-compliant invoices).

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet.

## Requirement

- [REQ023 — Billing depth: mixed tenders, day-end close, doctor revenue-share, and reconciliation](../../requirements/patient-payments/requirement/REQ023-patient-payments-2026-08-22-billing-depth-and-revenue-share.md) — draft

## Related

- [patient-payments-2026-08-20 bundle](../patient-payments-2026-08-20/manifest.md) — REQ004, the real Razorpay integration this requirement builds on top of.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
