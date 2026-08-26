---
id: TP172
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN148
related: [REQ108]
---

# TP172 — Test plan: validated ICD-10 coding for diagnoses

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive extension of an already-proven pattern (`clinicianTypes`/
`roomTypes`' own ungated global-reference-data shape).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `icd10Codes()` — no search term | Up to 20 active rows ordered by `code` ascending |
| 2 | `icd10Codes(search)` | Filters by code-prefix OR description-substring, case-insensitive |
| 3 | `icd10Codes()` — inactive row | Excluded regardless of search term |
| 4 | `icd10Codes` resolver | Delegates to the service with the given search term (including `undefined`) |
| 5 | `icd10Codes`/`clinicianTypes`/`roomTypes` role gating | All three remain ungated — no stricter gate introduced |
| 6 (frontend) | `EncounterWorkspace.jsx`'s ICD-10 field | Renders as an `Autocomplete` (`role="combobox"`), not a bare text box |
| 7 (frontend) | Typing in the field | Triggers the search query (debounced) |
| 8 (frontend) | Selecting a suggested option | Stores exactly the code string in `diagnosisForm.icd10_code`, not the option's full rendered label |
| 9 (frontend) | Leaving the field blank | Save still submits (regression guard — the field must never become "must select a real match") |
| 10 (seed) | Re-running `prisma db seed` | Idempotent — reports 0 newly created on a second run |
| 11 (integration) | `matrix-coverage.int-spec.ts` | Stays green with no new `EXEMPT`/`CASES` entry needed — `icd10Codes` lives inside the already-classified `lookups` domain |
