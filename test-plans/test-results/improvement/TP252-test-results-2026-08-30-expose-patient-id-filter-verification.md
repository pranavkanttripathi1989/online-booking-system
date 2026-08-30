---
id: TP252
type: improvement
feature: test-results
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN232
related: [REQ169, TR252]
---

# TP252 — Verification for exposing `patient_id` on `TestResultType` + filter argument

## Suggestion stage

Skipped. A narrow, well-understood extension of an already-proven domain
(`TestResults`), not a genuinely exploratory one.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `findAll` — `patientId` supplied | `where.patient_id` set to exactly that id |
| TC-02 | `findAll` — `patientId` omitted | `where.patient_id` key absent entirely |
| TC-03 | `toGraphQL` — a row with a real `patient_id` | exposed on the GraphQL response |
| TC-04 | `toGraphQL` — a free-text/walk-in row (`patient_id: null`) | `patient_id` left `undefined`, not `null` |
| TC-05 | Test Results tab — no results for the patient | real empty state, no fabricated rows |
| TC-06 | Test Results tab — a real result | rendered under its real field names, never the old `Dr. Jane Smith`/`Dr. Carlos Vega` mock names |
| TC-07 | View Result dialog | shows the real completed `values` table, not a placeholder message |
| TC-08 | Standalone `test-results/index.jsx` page | unaffected — still uses the canonical query, no `patient_id` argument added there |
| TC-09 | Live round trip | ordering a test for a real patient writes a real `patient_id`, and it appears on that patient's own detail-page tab |
