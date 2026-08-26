---
id: CTX-clinical-records-2026-08-25-req061
type: improvement
feature: clinical-records
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ061
related: [PLAN088, TP115, TR114]
---

# clinical-records — Structured diagnosis + note-template creation UI (2026-08-25)

Closes `project-plans/analysis/08-integration-gap-analysis.md` findings A-5 and
A-6 — part of the A-4–A-8 gap-fix batch found by a fresh
backend-vs-frontend integration sweep. `REQ020`'s own real, tested
`createDiagnosis`/`createEncounterTemplate` mutations had no frontend UI
— a diagnosis could only ever be typed as free-text prose, and the
one-click-template feature had no way to ever seed its own first
template through the app.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ061 | [Structured diagnosis + note-template creation UI](../../requirements/clinical-records/improvement/REQ061-clinical-records-2026-08-25-structured-diagnosis-and-note-templates-ui.md) |
| implementation-plans | PLAN088 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN088-clinical-records-2026-08-25-structured-diagnosis-and-note-templates-ui.md) |
| test-plans | TP115 | [test plan](../../test-plans/clinical-records/improvement/TP115-clinical-records-2026-08-25-structured-diagnosis-and-note-templates-ui.md) |
| test-results | TR114 | [results — pass, 3/3](../../test-results/clinical-records/improvement/TR114-clinical-records-2026-08-25-structured-diagnosis-and-note-templates-ui.md) |

## What shipped

A "Diagnoses" section + "Add Diagnosis" dialog and a "Save as template"
action, both on `pages/clinician/EncounterWorkspace.jsx`. New
`EncounterWorkspace.test.jsx` (3 cases). e2e coverage added to the shared
`frontend/e2e/gap-analysis-a4-a8.spec.js` (1 of its 4 scenarios, covering
both findings together against one real fixture appointment).

No backend change, no new bugs found in this individual slice's own
product code.
