---
id: REQ129
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ021
related: [PLAN169, TP189, TR189]
---

# REQ129 — Tamper-evident hash on printed prescriptions (US-RX-08)

## Why this slice

`REQ021`'s own P1 deferral list named "digital signatures" (US-RX-08) as
unbuilt. Confirmed still true before starting: `Prescriptions` had no
`pdf_hash` column and no `signature_id` concept anywhere. Also checked
the existing `documents`/pdfkit module (`REQ057`) and the print page
(`PrescriptionPrint.jsx`, `REQ021`'s own dual-rendering-path design) —
neither had any hash or signature-image handling.

## Scope correction, found before starting

`REQ021`'s own data-model sketch for this story listed `signature_id`
alongside `pdf_hash` — implying a clinician uploads and stores a real
signature *image*. Investigating the architecture before building
changed the plan on both halves of the story:

1. **No image-upload subsystem was built.** A real signature-image
   upload (storage, an account-settings UI to capture it, validation) is
   a genuinely separate, larger feature — its own file-upload subsystem,
   not a natural extension of this slice's own S–M sizing. The
   printed/rendered PDF already carries a real, attributed textual
   signature block (clinician name, qualifications, registration
   number) from `REQ021`'s own original build; this slice does not add
   an uploaded image. Logged as a deliberate cut below, not silently
   dropped.
2. **The hash is over content, not rendered PDF bytes.** This
   codebase's PDFs are generated on demand (pdfkit, server-side, no file
   ever persisted at rest) — there is no stored file for "later
   modification" to act on in the literal sense the acceptance criterion
   describes. Worse, pdfkit stamps a wall-clock `CreationDate` into every
   PDF it produces, so two renders of *byte-identical clinical content*
   would still hash differently — a raw PDF-bytes hash would be
   non-reproducible even with nothing tampered. The slice instead
   computes `pdf_hash` as a SHA-256 over the prescription's own canonical
   clinical content (patient/clinician/encounter/issued_at + every
   item), stamped once at issue time (`createPrescription` — the actual
   sign-off act on this domain, per its own existing comment: "issuing a
   script is a clinical act"). A short, human-checkable verification
   code (the first 12 hex characters, grouped) is now printed on both
   rendering paths, so a pharmacist or patient holding a printed copy can
   compare what's on the paper against what the app reports for that
   prescription id.

## User story

As a clinician, when I issue a prescription, I want the system to record
a tamper-evident fingerprint of what I actually prescribed, and print a
verification code on the document, so that anyone holding a copy has a
concrete way to notice if the clinical content has since diverged from
what was originally signed.

## Acceptance criteria

- **Given** a newly-issued prescription, **then** `pdf_hash` is stamped
  onto the row, deterministic for the same content.
- **Given** two prescriptions with different clinical content, **then**
  their `pdf_hash` values differ.
- **Given** a prescription's stored hash and its current DB content,
  **when** `verifyPrescriptionIntegrity` is queried, **then** it reports
  `valid: true` if they match and `valid: false` if they don't (or if no
  hash was ever stamped, e.g. a legacy pre-`REQ129` row).
- **Given** a printed/downloaded prescription, **then** it shows a short
  verification code derived from `pdf_hash`, on both the pdfkit PDF and
  the on-screen/`window.print()` preview page — the two must format the
  code identically.
- **Given** a caller without access to a prescription (cross-org,
  wrong patient, wrong clinician), **then** `verifyPrescriptionIntegrity`
  is rejected the same way `prescription()`/`printPrescription()`
  already are.

## In scope

- `Prescriptions.pdf_hash` column, computed in `createPrescription`.
- `verifyPrescriptionIntegrity` query.
- Verification-code rendering on both the pdfkit PDF
  (`documents.service.ts`) and the print/preview page
  (`PrescriptionPrint.jsx`).

## Deliberately out of scope

- Real uploaded signature-image capture/storage — a separate,
  larger feature (file upload subsystem + settings UI), not built this
  slice; the existing textual signature block (name/qualifications/
  registration number) is what's on the document today.
- Any frontend surface calling `verifyPrescriptionIntegrity` directly —
  it exists as a real, tested backend capability this slice; a
  dedicated "Verify a prescription" UI (e.g. for a pharmacist checking a
  paper copy against the printed code) is a follow-on, not required for
  this story's own acceptance criteria to be met.
- Backfilling `pdf_hash` on prescriptions issued before this migration —
  they remain `null`/unverifiable, matching how every other nullable
  "existing rows predate this" column in this codebase is handled
  (`REQ127`'s `TestResults.encounter_id`, `REQ014`'s `department_id`).
