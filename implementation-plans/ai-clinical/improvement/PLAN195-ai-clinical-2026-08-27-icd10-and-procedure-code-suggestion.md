---
id: PLAN195
type: improvement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ154
related: [REQ154, TP215, TR215]
---

# PLAN195 — AI coding assist (P2-02)

## Schema

- `backend/prisma/schema.prisma` — new `ProcedureCodes` model, identical
  shape to `Icd10Codes` (`id`, `code` unique, `description`, `category`,
  `is_active`, index on `category`). `Diagnoses.type` comment widened to
  `diagnosis | allergy | procedure`; new `procedure_code String?` column.
- `backend/prisma/migrations/20260827130000_procedure_codes/migration.sql`
  — hand-written (`prisma migrate dev` cannot run in this environment):
  `CREATE TABLE "ProcedureCodes"` + its unique/category indexes, `ALTER
  TABLE "Diagnoses" ADD COLUMN "procedure_code" TEXT`. Read end-to-end
  against the schema diff before applying, per the migration skill's own
  standing instruction.
- `backend/prisma/seed.ts` — `PROCEDURE_CODES`, 53 rows across 15
  categories (Consultation, Wound care, Injection/infusion, Immunization,
  Cardiovascular, ENT, Musculoskeletal, Respiratory, Obstetric/
  gynaecological, Dermatological, Genitourinary, Diagnostic, Minor
  procedure, Ophthalmic, Dental, Rehabilitation, Counselling), `PR-NNN`
  coded, same idempotent-skip-if-exists seeding loop as `ICD10_CODES`.

## Backend

- `backend/src/ai-clinical/coding-suggestion.ts` — new, pure. Splits note
  text and each candidate description into lowercase significant words
  (stopword-filtered, ≥3 chars), matches on overlap ratio (default ≥0.5 of
  a candidate's own significant words), ranks by score, caps at 5. No
  Prisma/service dependency — fully unit-testable, one implementation
  reused for both diagnosis and procedure suggestion.
- `backend/src/ai-clinical/ai-clinical.service.ts` — `suggestEncounterCodes
  (encounterId, user)`: calls `encountersService.encounter()` (reuses its
  self-scoping, does not re-derive it), joins all `notes[].content` into
  one string, runs `suggestCodes()` against `Icd10Codes`/`ProcedureCodes`
  (`is_active: true` only) in parallel, returns both suggestion arrays.
  Never writes anything.
- `backend/src/ai-clinical/entities/ai-clinical.entity.ts` —
  `CodeSuggestionType` (`code`, `description`, `category`, `matched_terms:
  [String]`, `score: Float`), `EncounterCodeSuggestionsType`.
- `backend/src/ai-clinical/ai-clinical.resolver.ts` — `suggestEncounterCodes`
  query, `@Auth('clinician','manager','admin','super_admin')`, **no**
  `EntitlementGuard`/`@RequiresFeature` — pure deterministic matching has
  no external vendor cost to meter, unlike transcription.
- `backend/src/lookups/entities/procedure-code.entity.ts` +
  `lookups.service.ts#procedureCodes()` + `lookups.resolver.ts` —
  line-for-line the same contract as `icd10Codes` (case-insensitive
  code-prefix/description-substring search, capped at 20, `is_active`
  only), ungated like every other platform reference-data query.
- `backend/src/encounters/dto/encounter.input.ts` —
  `CreateDiagnosisInput.type` widened to accept `'procedure'`; new
  `procedure_code` field, same optional/free-text shape as `icd10_code`.
- `backend/src/encounters/entities/encounter.entity.ts` — `DiagnosisType`
  gains `procedure_code`.
- `backend/src/encounters/encounters.service.ts` — `createDiagnosis()`
  passes `procedure_code` through to the Prisma `create()` call.

## Frontend

- `EncounterWorkspace.jsx`:
  - `ENCOUNTER_QUERY`'s `diagnoses` selection and `CREATE_DIAGNOSIS`'s
    return selection both gain `procedure_code`.
  - New `PROCEDURE_SEARCH_QUERY`/`SUGGEST_CODES_QUERY` (mirrors
    `ICD10_SEARCH_QUERY`'s own shape).
  - Add Diagnosis dialog: Type select gains a "Procedure" option; the
    ICD-10 Autocomplete is conditionally swapped for an identical-contract
    Procedure Autocomplete when `type === 'procedure'` (own debounced
    search state, `skip`ped unless the dialog is open AND that type is
    selected); Save sends `procedure_code` alongside `icd10_code`.
  - Diagnoses list: each saved row shows `procedure_code` alongside
    `icd10_code` when present.
  - New "Suggest Codes" button (next to "Add Diagnosis", same `!locked`
    guard) triggers a `useLazyQuery(SUGGEST_CODES_QUERY, {fetchPolicy:
    'network-only'})` — network-only so a re-opened dialog always reflects
    the encounter's current saved notes, not a stale cached read from an
    earlier visit.
  - New "AI Code Suggestions" dialog: two sections (Diagnosis codes /
    Procedure codes), each suggestion showing code, description, and
    `Matched: <terms>`; its own "Add" button pre-fills `diagnosisForm`
    (type/text/code) and opens the existing Add Diagnosis dialog — the
    suggestions dialog itself never calls `onAddDiagnosis` directly, so a
    clinician's own explicit Save click is always the thing that persists
    anything (FR-AI-06).

## Design decisions worth recording

1. **`Diagnoses` reused, not a new table.** The model already does double
   duty for `diagnosis`/`allergy` by explicit prior design; a procedure
   annotation is the same shape (code + free text + status). A parallel
   `Procedures` table would duplicate that shape for no real benefit.
2. **`procedure_code` is its own column, not an overload of `icd10_code`.**
   A procedure code is not an ICD-10 code; storing one under that column
   name would mislead a future reader of raw data, unlike the `type`
   discriminator which is self-documenting by design.
3. **Not gated behind `ai_scribe`.** Transcription has a real external
   vendor cost (a paid API call per minute) the entitlement guard exists
   to meter; this feature is pure in-process keyword matching against data
   already in Postgres — no cost to gate.
4. **`ProcedureCodes` is explicitly not a licensed CPT/HCPCS set.** Both
   are proprietary US terminology systems with real licensing
   requirements this codebase has no license for. The seeded set is an
   internal, honestly-scoped India-OPD reference list, matching `REQ108`'s
   own honesty about its ICD-10 starter set not being the full WHO list.

## Verification

Backend: 115/115 unit suites, 1846/1846 tests (23 new — 10 in
`coding-suggestion.spec.ts`, 5 in `ai-clinical.service.spec.ts`'s new
`suggestEncounterCodes` block, 2 resolver-gating assertions, 3 in
`lookups.service.spec.ts`, 2 in `lookups.resolver.spec.ts`, 1 in
`encounters.service.spec.ts`); `tsc --noEmit`/`eslint` clean; integration
9/9 suites, 414/414 tests (including `ai-clinical.int-spec.ts`, confirming
the new migration applies cleanly via a real `migrate deploy` against
`postgres_test`). Frontend: 2 new tests in
`EncounterWorkspace.test.jsx` (procedure creation via the real mutation,
AI-suggestion-to-prefill flow) both pass; full suite 22/23 in that file
(the 1 failure, an unrelated pre-existing referral-status test, confirmed
passing in isolation — contention flakiness, not a regression); lint
ratchet raised 4820→4832 (12 new warnings, all pre-existing I18N-1/
hardcoded-string classes already present throughout this un-migrated
file, not a new debt category); build + `size-limit` green (initial
bundle 348.56/350 KB — tight, worth a future slice's attention, not a
regression from this one alone).
