---
id: TP215
type: improvement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN195
related: [REQ154, TR215]
---

# TP215 — Test plan: AI coding assist (P2-02)

Well-scoped against an already-proven pattern (`extractPrescriptionDraft`'s
own deterministic-match-and-draft shape, `REQ108`'s own ICD-10 search UX).
Suggestion stage skipped per `CLAUDE.md`'s own conditional rule; drafted
directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1–10 | Overlap-based matching, `matched_terms` correctness, ranking by score, no fabrication outside the reference list, stopword filtering, `maxResults`/`minOverlapRatio` options, empty-note handling, works identically for both diagnosis and procedure lists | `coding-suggestion.spec.ts` |
| 11 | Reuses `encountersService.encounter()`'s own self-scoping | `ai-clinical.service.spec.ts` |
| 12 | Queries only `is_active: true` rows from both reference tables | same |
| 13 | Joins every note section into one text before matching | same |
| 14 | Returns empty suggestion arrays for a note-less encounter, never throwing | same |
| 15 | Never fabricates a suggestion outside the real reference tables | same |
| 16–17 | `suggestEncounterCodes` carries no `@RequiresFeature`; gated to clinician/manager/admin/super_admin, never patient | `ai-clinical.resolver.spec.ts` |
| 18–20 | `procedureCodes` mirrors `icd10Codes`'s own no-search/search/is_active contract | `lookups.service.spec.ts` |
| 21–22 | `procedureCodes` resolver ungated; delegates search term correctly | `lookups.resolver.spec.ts` |
| 23 | `createDiagnosis` passes `procedure_code` through for a procedure-type row | `encounters.service.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | The new migration applies cleanly via `migrate deploy` (implicit — `ai-clinical.int-spec.ts` and the full suite depend on it) |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Adds a procedure via the real `createDiagnosis` mutation, using the procedure-code search Autocomplete | `EncounterWorkspace.test.jsx` |
| 2 | Shows AI code suggestions (diagnosis + procedure) with their matched terms | same |
| 3 | Clicking "Add" on a suggestion pre-fills and opens the Add Diagnosis dialog without saving anything | same |

## Out of scope for this test plan

- Wiring these codes into `Claims` — `P2-03`'s own test plan.
- A real accuracy benchmark for the keyword-matching heuristic against
  labeled clinical notes — no such dataset exists in this environment,
  matching the same honest limitation `no-show-risk`'s own weighting has.
- E2E/Playwright coverage — this is an internal clinician-facing dialog
  addition inside an already-covered page; unit coverage through
  `MockedProvider` against the real query/mutation contracts is the
  established pattern for this file.
