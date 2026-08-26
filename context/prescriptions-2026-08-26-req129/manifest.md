---
id: CTX-prescriptions-2026-08-26-req129
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ129
related: [PLAN169, TP189, TR189]
---

# prescriptions — REQ129: tamper-evident hash on printed prescriptions (2026-08-26)

Sixth slice of the next 10-slice batch (`project-plans/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ129 | [Tamper-evident hash](../../requirements/prescriptions/improvement/REQ129-prescriptions-2026-08-26-tamper-evident-signature.md) |
| implementation-plans | PLAN169 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN169-prescriptions-2026-08-26-tamper-evident-signature.md) |
| test-plans | TP189 | [verification plan](../../test-plans/prescriptions/improvement/TP189-prescriptions-2026-08-26-tamper-evident-signature.md) |
| test-results | TR189 | [verification results — pass](../../test-results/prescriptions/improvement/TR189-prescriptions-2026-08-26-tamper-evident-signature.md) |

## What shipped

`REQ021`'s own P1 deferral list named "digital signatures" (US-RX-08) as
unbuilt. `Prescriptions.pdf_hash` — a SHA-256 over the prescription's
own canonical clinical content, stamped at issue time — plus a
`verifyPrescriptionIntegrity` query, plus a short human-checkable
verification code printed on both the pdfkit PDF and the
`PrescriptionPrint.jsx` preview page.

**Two scope corrections found before starting**: (1) no real uploaded
signature-*image* subsystem was built — a genuinely separate, larger
feature, deliberately deferred, not silently dropped; the existing
textual signature block (name/qualifications/registration number)
already on the PDF is what's there today. (2) the hash is computed over
canonical clinical *content*, not rendered PDF bytes — pdfkit stamps a
wall-clock `CreationDate` into every PDF it produces, which would make
byte-hashing non-reproducible even for identical content; content
hashing is deterministic and the technically correct choice for this
architecture (PDFs generated on demand, never persisted at rest).

## Verification

Backend: 92/92 unit suites, 1499/1499 tests (12 new); integration 4/4
suites, 387/387 unchanged (new migration applied cleanly via the
integration harness's own `global-setup.ts`). `tsc --noEmit`/`eslint`
clean. Frontend: `PrescriptionPrint.test.jsx` 6/6 (2 new), `eslint`
clean (2 pre-existing, unrelated warnings unchanged).
