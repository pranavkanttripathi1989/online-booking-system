---
feature: platform-billing
date: 2026-08-22
ids: [REQ033]
status: in-progress
---

# platform-billing — 2026-08-22

Derived from the CareOS PRD's §11 Flow B (tenant-to-platform subscription collection), governed by RBI's 2026 e-mandate framework. Entirely net-new and distinct from the already-real Razorpay patient-payment flow (`REQ004`/`REQ023`) — this is recurring platform billing with hard regulatory rules (24-hour pre-debit notice, a 15,000-rupee OTP-free ceiling, zero mandate fees).

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet. Per `CLAUDE.md`'s working loop, the next step is entering plan mode and exploring the relevant existing code before any implementation-plan document is written, not proceeding straight to code.

## Requirement

- [REQ033 — see file for full title](../../requirements/platform-billing/requirement/REQ033-platform-billing-2026-08-22-upi-autopay-e-mandate-collection.md) — draft

## Related

- [project-plans/07-prd-gap-analysis-and-roadmap.md](../../project-plans/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
