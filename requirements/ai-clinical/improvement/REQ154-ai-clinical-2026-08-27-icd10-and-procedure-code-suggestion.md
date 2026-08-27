---
id: REQ154
type: improvement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ151
related: [PLAN195, TP215, TR215]
---

# REQ154 — AI coding assist: ICD-10 + procedure codes from the note (P2-02)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-02 slice,
the first unblocked slice of Phase 2 (`P2-01` depends on the still-blocked
ABDM `P1-10`). Its own tracker note reads: *"`REQ020` P1 named ICD-10; now
AI-driven"* — `REQ108` (2026-08-26) already closed the manual half of that
residue (a real, searchable ICD-10 reference list a clinician types
against), but coding still starts from a blank search box. This slice adds
the AI half: real candidate codes suggested from the encounter's own note
text, for a clinician to review and accept — never fabricated, never
auto-saved.

## What was found before scoping

- **No procedure-code concept existed anywhere in this codebase** — no
  model, no seed data, no UI. `Claims.claim_amount` is a single lump sum;
  nothing records *what* a claim is for beyond the linked appointment. This
  is a real, separate gap `P2-03` (agentic claim lifecycle) will need
  closed to have real per-line codes to submit — this slice is that
  prerequisite, not scope creep.
- `Diagnoses` (`type: 'diagnosis' | 'allergy'`) already does double duty
  for two conceptually different things on one table, by the schema's own
  documented design ("the specified model doing double duty, not an
  invented one"). A coded procedure performed during an encounter is the
  identical shape (a code, free text, a status) — extended the same table
  with a third `type: 'procedure'` rather than inventing a parallel one.
- `AiClinicalService` already has the exact pattern this needs:
  `extractPrescriptionDraft()` does deterministic keyword/regex extraction
  over real text, fuzzy-matches against a real master table, and returns
  drafts only — the frontend pre-fills an existing builder, a human still
  submits. This slice's `suggestEncounterCodes()` follows the identical
  shape, reusing `encountersService.encounter()`'s own self-scoping rather
  than re-deriving it (the same "reuse, don't re-derive" pattern
  `preConsultSummary`/`extractPrescriptionDraft` already use).

## User story

As a clinician finishing a note, I want candidate ICD-10 diagnosis codes
and procedure codes suggested from what I actually wrote, with the exact
words that triggered each suggestion shown — so I code faster without
trusting a black box, and without a fabricated code ever reaching a real
record without me reviewing it.

## Acceptance criteria

- **Given** an encounter with saved note content, **when** a clinician
  clicks "Suggest Codes", **then** they see ranked ICD-10 and procedure
  code candidates, each showing the code, description, and the specific
  words from the note that matched.
- **Given** no real keyword overlap between the note and a reference code,
  **then** that code is never suggested — no suggestion is ever fabricated
  outside the real `Icd10Codes`/`ProcedureCodes` reference tables.
- **Given** a clinician clicks "Add" on a suggestion, **then** the existing
  "Add Diagnosis" dialog opens pre-filled with that code and description —
  nothing is saved until the clinician reviews and clicks Save themselves
  (`FR-AI-06`'s own never-auto-without-a-human-decision discipline).
- **Given** an encounter with no saved notes yet, **then** suggestions are
  an honest empty state, never an error.
- **Given** the "Add Diagnosis" dialog's Type is set to Procedure,
  **then** a real, searchable procedure-code type-ahead (mirroring
  `REQ108`'s own ICD-10 search UX exactly) is available, and the field
  stays free-text-capable — the same soft-validation contract `icd10_code`
  already has.
- **Given** no AI provider cost is involved (pure deterministic matching,
  unlike transcription), **then** this feature is **not** gated behind the
  paid `ai_scribe` entitlement — available to any clinical role that can
  already see the encounter.

## In scope

- `ProcedureCodes` — a curated ~50-code OPD-relevant starter set, platform-
  global like `Icd10Codes`, seeded via `prisma/seed.ts`. Explicitly **not**
  a licensed CPT/HCPCS set (both are proprietary US terminology systems
  this codebase has no license to redistribute) — an internal India-OPD
  reference list, honestly scoped the same way `REQ108` scoped its own
  ICD-10 starter set against the full WHO code set.
- `Diagnoses.type` gains `'procedure'`; a new `procedure_code` column
  (its own field, not overloading `icd10_code` — a procedure code is not
  an ICD-10 code, and storing one under that name would mislead any
  future reader of raw data).
- `backend/src/ai-clinical/coding-suggestion.ts` — pure, deterministic
  keyword-overlap matcher (significant-word overlap ratio, stopword-
  filtered), reused identically for both diagnosis and procedure
  suggestion. Every suggestion carries `matched_terms` for reviewability.
- `AiClinicalService.suggestEncounterCodes()` + `suggestEncounterCodes`
  query (`@Auth('clinician','manager','admin','super_admin')`, no
  entitlement gate).
- `LookupsService.procedureCodes()` + `procedureCodes` query — identical
  contract to the existing `icd10Codes` search.
- `EncounterWorkspace.jsx` — "Suggest Codes" button, a suggestions dialog,
  a Procedure type option + type-ahead in the existing Add Diagnosis
  dialog, `procedure_code` rendered alongside `icd10_code` on each saved
  diagnosis row.

## Deliberately out of scope

- Wiring these codes into `Claims` itself (`P2-03`'s own job — "consume
  P2-02's codes" is explicit in the phase doc).
- A real LLM/NLU call — no structuring-LLM provider/credentials exist in
  this environment to call honestly, matching every other module in
  `ai-clinical/`'s own "buy, don't build" (PRD v2 D1) constraint.
- The full WHO ICD-10 set or a licensed CPT/HCPCS set — curated starter
  sets only, same honesty as `REQ108`.
- Hard validation rejecting a code outside either reference list — both
  fields stay free-text-capable, matching `icd10_code`'s existing contract.
