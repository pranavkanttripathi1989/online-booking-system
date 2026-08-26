---
id: TP198
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN178
related: []
---

# TP198 — Test plan: reimbursement-pack PDF generation

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Role gate closes the REST bypass | Patient/clinician JWT calls `reimbursementPackPdf` | `ForbiddenException`; `InsuranceService.claim` never called |
| 2 | Cross-org rejection | Staff JWT, claim in another org | Propagates `claim()`'s own `NotFoundException` |
| 3 | Real pack rendered | Authorized staff caller, real claim + evidence | Real PDF (`%PDF` magic bytes); both `InsuranceService` calls made with the same `(claimId, user)` |
| 4 | Empty-evidence honesty | Claim with `claimEvidencePrescriptions` returning `[]` | Real PDF, no crash, an honest "no prescriptions" line (not asserted verbatim, covered by the PDF still rendering) |
| 5 | Missing clinic lookup | `appointments.findUnique` resolves `null` | Real PDF still renders |
| 6 | Frontend download wiring | Click "Pack" on a claim row | `downloadAuthenticatedPdf` called with `/documents/claims/<id>/reimbursement-pack/pdf` and `reimbursement-pack-<id>.pdf` |
| 7 | Full suite regression | Backend unit + integration; frontend claims suite | 92/92 / 1549/1549; integration 4/4 / 387/387 unchanged (module wiring boots cleanly); frontend 5/5 |
| 8 | Lint/typecheck/build clean | All touched files, full lint ratchet, `npm run build` | 0 errors; 1909 warnings unchanged; build succeeds |
