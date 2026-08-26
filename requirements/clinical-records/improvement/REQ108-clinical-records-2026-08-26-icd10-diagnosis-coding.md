---
id: REQ108
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ020
related: [PLAN148, TP172, TR172]
---

# REQ108 — Validated ICD-10 coding for diagnoses

## Why this slice

`REQ020` shipped the `Diagnoses` model with an `icd10_code String?` column
from day one, but the column's own schema comment is explicit about the
gap: *"icd10_code is nullable/free-text-fallback at MVP per the
requirement's own note — real coding (FR-EMR-03) is P1."*
`CreateDiagnosisInput.icd10_code` carries the identical note ("No real
ICD-10 coding this slice (P1)... free text only"). Confirmed live: the
"Add Diagnosis" dialog on `EncounterWorkspace.jsx` is a bare `TextField`
labeled "ICD-10 code (optional)" — a clinician can type anything,
including a typo, a made-up code, or nothing. Nothing in the system
validates it against a real code, and nothing helps a clinician find the
right one.

This is `REQ020`'s own long-deferred P1 residue (FR-EMR-03), not new
scope — the column, the input field, and the dialog already exist. This
slice adds the missing middle layer: a real, searchable ICD-10 reference
list a clinician can type against, with the code validated on save.

## Scope

A curated **starter set of ~100 ICD-10 codes** covering the categories
most relevant to Indian outpatient (OPD) practice — respiratory,
endocrine/metabolic, cardiovascular, gastrointestinal, musculoskeletal,
infectious, dermatological, ENT, genitourinary, mental health, general
symptoms, and obstetric/pediatric — seeded as static reference data. This
is **explicitly not** the full WHO ICD-10 code set (~14,000+ codes,
several thousand even in the commonly-used subset) — that remains
deferred future work, logged here rather than silently promised.

Free-text diagnosis entry remains fully supported and unchanged — a
clinician can still save a diagnosis with no code, or (for now) any code
string, since making the field a hard `@IsIn()` validator against ~100
seed rows would incorrectly reject every real code outside that starter
set. Validation in this slice is soft: a real, growing reference list
with type-ahead search, not a closed enum.

### Given/When/Then acceptance criteria

- **Given** a clinician opens "Add Diagnosis" on `EncounterWorkspace.jsx`,
  **when** they type into the ICD-10 field, **then** they see a live,
  matched-against-real-codes dropdown (search by code prefix or
  description substring) instead of a bare text box.
- **Given** a clinician selects a suggested code, **when** they save the
  diagnosis, **then** the stored `icd10_code` is the exact selected code
  string (unchanged storage shape — no schema migration needed for the
  `Diagnoses` table itself).
- **Given** a clinician's search term matches nothing in the seed list,
  **when** they still want to save a free-text code or leave it blank,
  **then** they are not blocked — the field remains free-text-capable,
  matching current behaviour.
- **Given** the same reference list, **when** any other part of the
  product later needs an ICD-10 lookup (e.g. `analytics-reporting`'s
  diagnosis-frequency reports), **then** it can query the same new
  reference table rather than re-deriving one.

## Deliberately out of scope

- The full WHO ICD-10 (or ICD-10-CM) code set — only a curated ~100-code
  OPD-relevant starter set ships this slice.
- Hard validation/rejection of a code not in the seed list — the field
  stays free-text-capable by design (see Scope).
- ICD-11 — out of scope entirely; this codebase and the PRD both
  reference ICD-10.
- Any live external terminology-server integration (e.g. a WHO API call)
  — this would introduce an unplanned external vendor dependency against
  the spirit of Hard Rule 9; the reference list is static, seeded data,
  extendable by a future migration.
- Discrete vitals/growth charts, investigation orders, referrals — the
  other three items still named in `REQ020`'s own deferred P1/P2 list —
  each is separate, unrelated scope.
