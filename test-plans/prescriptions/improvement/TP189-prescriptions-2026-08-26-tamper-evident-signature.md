---
id: TP189
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN169
related: []
---

# TP189 — Test plan: tamper-evident hash on printed prescriptions

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Hash stamped on create | `createPrescription` | Follow-up `update()` call with a 64-char hex `pdf_hash`; returned row includes it |
| 2 | Deterministic + content-sensitive | Two prescriptions, same vs. different items | Same content → same hash; different content → different hash |
| 3 | Valid on match | `verifyPrescriptionIntegrity` after a real create | `valid: true`, `stored_hash === computed_hash` |
| 4 | Invalid on mismatch | Stored hash altered | `valid: false` |
| 5 | Invalid, no crash, on a legacy row | `pdf_hash: null` | `valid: false`, `stored_hash: undefined`, no throw |
| 6 | Access control matches `prescription()` | Cross-org caller | `NotFoundException` |
| 7 | PDF still renders with a hash | `prescriptionPdf` with `pdf_hash` set | Real PDF (`%PDF` magic bytes) |
| 8 | PDF still renders without a hash | `prescriptionPdf` with `pdf_hash` absent | Real PDF, no crash |
| 9 | Frontend renders the formatted code | `PrescriptionPrint` with a `pdf_hash` | `Verification code: XXXX-XXXX-XXXX` shown |
| 10 | Frontend omits the line for a legacy Rx | `PrescriptionPrint` with `pdf_hash: null` | No "Verification code" text present |
| 11 | Full suite regression | Backend unit + integration; frontend `PrescriptionPrint` suite | 92/92 / 1499/1499; integration 4/4 / 387/387 unchanged; frontend 6/6 |
| 12 | Lint/typecheck clean | All touched files | 0 errors |
