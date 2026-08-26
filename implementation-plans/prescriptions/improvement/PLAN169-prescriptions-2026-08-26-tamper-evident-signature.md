---
id: PLAN169
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ129
related: [TP189, TR189]
---

# PLAN169 — Implementation plan: tamper-evident hash on printed prescriptions

## Change

**`backend/prisma/schema.prisma`**: `Prescriptions` gains
`pdf_hash String?` (nullable — existing rows predate this). New
hand-written migration `20260826200000_prescription_pdf_hash/migration.sql`
(one `ALTER TABLE ADD COLUMN`).

**`backend/src/prescriptions/entities/prescription.entity.ts`**:
`PrescriptionType` gains `pdf_hash?: string`. New
`PrescriptionIntegrityType` (`prescription_id`, `valid`, optional
`stored_hash`, `computed_hash`).

**`backend/src/prescriptions/prescriptions.service.ts`**: new private
`computeContentHash(prescription, items)` — SHA-256 over a canonical
JSON of `patient_id`/`clinician_id`/`encounter_id`/`issued_at` (ISO
string) plus every item's `drug_id`/`dose`/`frequency`/`route`/
`duration_days`/`qty`/`instructions`, deliberately over content rather
than rendered PDF bytes (see `REQ129`'s own scope-correction note on why
— pdfkit's `CreationDate` stamp makes byte-hashing non-reproducible).
`createPrescription` now computes and stores this via a follow-up
`update()` call right after `create()` (issued_at is DB-stamped
`default(now())`, not known until the row exists, so the hash can't be
included in the original `create()` call's own `data`). New
`verifyPrescriptionIntegrity(id, user)` — reuses `loadPrescriptionForUser`
(identical access control to `prescription()`/`printPrescription()`),
recomputes the hash from current DB content, and reports
`valid: prescription.pdf_hash === computedHash`.

**`backend/src/prescriptions/prescriptions.resolver.ts`**: new
`verifyPrescriptionIntegrity` query, same `@Auth(...)` gate as
`printPrescription`.

**`backend/src/documents/documents.service.ts`**: new
`formatVerificationCode(hash)` helper (first 12 hex chars, uppercased,
grouped in 4s with dashes). `drawPrescriptionPdf` now prints
`Verification code: XXXX-XXXX-XXXX` under the existing Signature line
when `data.prescription.pdf_hash` is present (silently omitted for a
legacy row with none).

**`frontend/src/pages/prescriptions/PrescriptionPrint.jsx`**:
`PRINT_QUERY` now also selects `prescription.pdf_hash`. A local
`formatVerificationCode()` mirrors the backend helper verbatim — both
must derive the identical display string from the same hash for a
printed copy to be checkable against the app. Renders the same
verification-code line under the Signature block.

## Testing

`backend/src/prescriptions/prescriptions.service.spec.ts`: 10 new cases
— `createPrescription` stamps a 64-char hex `pdf_hash` via a follow-up
`update()` call; identical content hashes identically, different
content hashes differently; `verifyPrescriptionIntegrity` reports
`valid: true` on a matching hash, `valid: false` on a mismatch
(simulated tamper) and on a legacy `null`-hash row, and rejects a
cross-org caller with the same access control as `prescription()`.

`backend/src/documents/documents.service.spec.ts`: 2 new cases — still
renders a real PDF (`%PDF` magic bytes) both with and without a
`pdf_hash` present on the assembled data.

`frontend/src/pages/prescriptions/PrescriptionPrint.test.jsx`: 2 new
cases — renders the exact formatted verification code for a supplied
`pdf_hash`; renders no verification-code line at all for a legacy
prescription with `pdf_hash: null`.

Full backend unit suite: 92/92 suites, 1499/1499 tests (12 new).
Integration suite: 4/4 suites, 387/387 unchanged — the new migration
applies cleanly via `test:int`'s own `global-setup.ts`; no new
tenancy-matrix row needed (`prescriptions` domain already classified).
`tsc --noEmit`/`eslint` clean on backend. Frontend:
`PrescriptionPrint.test.jsx` 6/6 (2 new), `eslint` clean (2 pre-existing
warnings on this file, unrelated lines, unchanged by this slice).

## Documentation

`REQ129` (this requirement, includes the content-vs-bytes-hash and
no-image-upload scope corrections), `PLAN169` (this plan), `TP189`/
`TR189` (verification), a context bundle, and index updates across all
five doc roots plus the `prescriptions` feature README.
