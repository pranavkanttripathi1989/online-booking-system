---
id: TP115
type: improvement
feature: clinical-records
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN088
related: [REQ061]
---

# TP115 — Test plan for structured diagnosis + note-template creation UI

## Frontend unit — `frontend/src/pages/clinician/EncounterWorkspace.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | Real recorded diagnoses render | Type/status chips, ICD-10 code, and text all shown — not just the empty state |
| 2 | Adding a diagnosis | Real `createDiagnosis` mutation fires with the right `encounter_id`/`type`/`text`; the encounter refetches and the new diagnosis appears |
| 3 | Saving the current note as a template | Real `createEncounterTemplate` mutation fires with `sections_json` matching the encounter's current section content and `org_shared: true`; a success snackbar is shown |

## e2e — `frontend/e2e/gap-analysis-a4-a8.spec.js` (shared A-4–A-8 fixture file, new)

| # | Scenario | Assertion |
|---|---|---|
| 1 | Clinician opens a real disposable appointment's consultation, adds a diagnosis | The real mutation response is OK; the diagnosis text appears in the Diagnoses list |
| 2 | Same session, fills a note section and saves it as a template | The real mutation response is OK; the previously-empty Templates list now shows the new template |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test -- --runInBand && npm run build
npx playwright test gap-analysis-a4-a8.spec.js --workers=1
node scripts/check-page-data-wiring.mjs
```

No backend changes in this slice — full backend suite not re-run since
no backend file was touched (confirmed via `git status`).
