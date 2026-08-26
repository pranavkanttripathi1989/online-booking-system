---
id: TP173
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN149
related: [REQ109]
---

# TP173 — Test plan: OTP-gated WhatsApp sharing of a prescription PDF

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive extension reusing already-proven patterns (the password-reset-
token shape, `getActiveConfigForOrg`'s existing dispatch mechanics).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `sharePrescriptionViaWhatsapp` — unauthorized caller | Rejected identically to `printPrescription`'s own rejection (delegates to `loadPrescriptionForUser`, not a new check) |
| 2 | `sharePrescriptionViaWhatsapp` — no WhatsApp provider configured | `{success: false}`, no `PrescriptionShareOtps` row written, no send attempted |
| 3 | `sharePrescriptionViaWhatsapp` — WhatsApp configured, no SMS provider | `{success: false}` before the WhatsApp send is even attempted (OTP would be undeliverable) |
| 4 | `sharePrescriptionViaWhatsapp` — happy path | Both provider `.send()` calls made with the patient's real phone; a `PrescriptionShareOtps` row written; a signed token with `purpose: 'rx_share'` and 15-minute expiry generated; `phone_last_two` returned |
| 5 | `sharePrescriptionViaWhatsapp` — WhatsApp send itself fails | `{success: false}`, SMS never attempted |
| 6 | `sharePrescriptionViaWhatsapp` — link sent, OTP SMS fails | `{success: false}` (must not report success when the code is undeliverable) |
| 7 | `verifyShareOtp` — no matching unconsumed row | Rejected with the same "expired" message as an actually-expired row (no distinguishable leak) |
| 8 | `verifyShareOtp` — expired row | Rejected, same message as case 7 |
| 9 | `verifyShareOtp` — attempts at lockout threshold | Rejected, same message as case 7 |
| 10 | `verifyShareOtp` — wrong code | Distinct "Incorrect code" message; increments `attempts`; row NOT consumed |
| 11 | `verifyShareOtp` — correct code within TTL and under the limit | Row's `consumed_at` set; no further verify against this row can succeed |
| 12 | `documents.controller.ts`'s `share-verify` — missing token/otp in body | Rejected |
| 13 | `share-verify` — invalid/expired/tampered signed link token | Rejected before `verifyShareOtp` is ever called |
| 14 | `share-verify` — wrong `purpose` claim | Rejected (defends against a token minted for a different purpose, e.g. a login challenge, being replayed here) |
| 15 | `prescriptionPdfForShare` | Verifies the OTP before assembling/rendering anything; renders the exact same bytes `prescriptionPdf` produces from equivalent data |
| 16 (integration) | `matrix-coverage.int-spec.ts` | Stays green, unchanged — `documents/` has no `.resolver.ts`, structurally invisible to the matrix, same as `AttachmentsController`/`OrgBrandingController` |
| 17 (frontend) | `PrescriptionPrint.jsx`'s "Share via WhatsApp" button | Loading state while sending; success toast naming only the last 2 phone digits; error toast showing the real `userErrors` message on `success:false` |
| 18 (frontend) | `/share/rx/:token` page | Public, no login; accepts a 6-digit code; POSTs `{token, otp}` to `share-verify`; triggers a PDF download on success |
