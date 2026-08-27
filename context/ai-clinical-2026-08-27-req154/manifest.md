---
id: CTX-ai-clinical-2026-08-27-req154
type: improvement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ154
related: [PLAN195, TP215, TR215]
---

# ai-clinical — AI coding assist: ICD-10 + procedure codes from the note (2026-08-27)

Phase 2 slice **P2-02** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`)
— the first unstarted, unblocked slice of Phase 2 (`P2-01` depends on the
still-blocked ABDM `P1-10`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ154 | [AI coding assist](../../requirements/ai-clinical/improvement/REQ154-ai-clinical-2026-08-27-icd10-and-procedure-code-suggestion.md) |
| implementation-plans | PLAN195 | [implementation plan](../../implementation-plans/ai-clinical/improvement/PLAN195-ai-clinical-2026-08-27-icd10-and-procedure-code-suggestion.md) |
| test-plans | TP215 | [test plan](../../test-plans/ai-clinical/improvement/TP215-ai-clinical-2026-08-27-icd10-and-procedure-code-suggestion.md) |
| test-results | TR215 | [results](../../test-results/ai-clinical/improvement/TR215-ai-clinical-2026-08-27-icd10-and-procedure-code-suggestion.md) |

## What shipped

- `ProcedureCodes` — a new, curated ~53-code OPD-relevant procedure
  reference set (platform-global, like `Icd10Codes`), explicitly **not**
  a licensed CPT/HCPCS set.
- `Diagnoses` extended with a `'procedure'` type and its own
  `procedure_code` column, reusing the model's existing double-duty
  design rather than a new table.
- `backend/src/ai-clinical/coding-suggestion.ts` — a pure, deterministic
  keyword-overlap matcher, reused identically for diagnosis and procedure
  suggestion. Every suggestion carries `matched_terms` for reviewability.
- `suggestEncounterCodes` query — draft suggestions from an encounter's
  own saved note text, never gated behind the paid `ai_scribe`
  entitlement (no external vendor cost to meter, unlike transcription).
- `procedureCodes` search query, mirroring `icd10Codes` exactly.
- `EncounterWorkspace.jsx` — a "Suggest Codes" button, an AI Code
  Suggestions dialog, a Procedure type + type-ahead in the existing Add
  Diagnosis dialog. Every suggestion's "Add" pre-fills the existing
  dialog rather than saving directly — a clinician's own Save click is
  always what persists anything (FR-AI-06).

## A real, previously-unlogged gap found while scoping

`Claims` (from the earlier `insurance-claims` slices) carries only a
lump `claim_amount` — nothing anywhere in this codebase recorded what a
claim is actually for. `P2-03` (agentic claim lifecycle) needs real
per-line diagnosis/procedure codes to consume, and none existed. Closed
as this slice's own necessary prerequisite, not scope creep — logged in
REQ154's own "What was found before scoping" section rather than
discovered mid-`P2-03`.

## Design decisions worth knowing before touching this again

1. `Diagnoses` reused for procedures rather than a new table — same
   shape (code + free text + status), matching the model's own existing
   `diagnosis`/`allergy` double-duty precedent.
2. `procedure_code` is its own column, not an overload of `icd10_code` —
   a procedure code is not an ICD-10 code.
3. Not gated behind `ai_scribe` — pure in-process matching has no vendor
   cost to meter.
4. `ProcedureCodes` is an honestly-scoped internal reference list, not a
   claim to a licensed CPT/HCPCS set this codebase has no license for.

## Verification

Backend: 115/115 unit suites, 1846/1846 tests (23 new); integration 9/9
suites, 414/414 tests (confirms the new migration applies cleanly via a
real `migrate deploy`); `tsc`/`eslint` clean. Frontend: 22/23 in
`EncounterWorkspace.test.jsx` (2 new, both passing; the 1 failure is a
pre-existing, confirmed-unrelated contention flake); lint ratchet raised
4820→4832 (all pre-existing warning classes); build + `size-limit`
green (initial bundle now at 348.56/350 kB — tight, flagged for a future
slice, not a regression from this one). See TR215 for the full account.

## What this unblocks

`P2-03` (agentic claim lifecycle) can now proceed — it explicitly
depends on this slice's own suggestion shape and the new
`Diagnoses.procedure_code` column.
